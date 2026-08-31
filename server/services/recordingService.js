const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const mediaService = require('./mediaService');
const { Recording } = require('../models/Schemas');

let nextPort = 10000;
function getFreePorts(count) {
  const ports = [];
  for (let i = 0; i < count; i++) {
    ports.push(nextPort++);
    if (nextPort > 20000) nextPort = 10000;
  }
  return ports;
}

const activeRecordings = new Map(); // roomCode -> recordingState

async function startRecording(roomCode, teacherPeerId) {
  if (activeRecordings.has(roomCode)) {
    throw new Error('Recording already active for this room');
  }

  const room = mediaService.rooms.get(roomCode);
  if (!room) throw new Error('Room not found');

  const peer = room.peers.get(teacherPeerId);
  if (!peer) throw new Error('Teacher peer not found');

  let audioProducer = null;
  let videoProducer = null;

  // Locate the teacher's audio and video producers
  for (const prodId of peer.producers) {
    const prod = room.producers.get(prodId);
    if (!prod) continue;
    if (prod.kind === 'audio') {
      audioProducer = prod;
    } else if (prod.kind === 'video' && prod.appData.label !== 'screen') {
      videoProducer = prod;
    }
  }

  if (!audioProducer || !videoProducer) {
    throw new Error('Teacher must enable camera and mic to start recording');
  }

  const router = room.router;

  // Create PlainTransports to stream raw RTP (no DTLS/SRTP) to FFmpeg
  const audioPlainTransport = await router.createPlainTransport({
    listenInfo: { protocol: 'udp', ip: '127.0.0.1' },
    rtcpMux: false
  });

  const videoPlainTransport = await router.createPlainTransport({
    listenInfo: { protocol: 'udp', ip: '127.0.0.1' },
    rtcpMux: false
  });

  const [audioRtpPort, audioRtcpPort, videoRtpPort, videoRtcpPort] = getFreePorts(4);

  // Connect local loopback ports
  await audioPlainTransport.connect({
    ip: '127.0.0.1',
    port: audioRtpPort,
    rtcpPort: audioRtcpPort
  });

  await videoPlainTransport.connect({
    ip: '127.0.0.1',
    port: videoRtpPort,
    rtcpPort: videoRtcpPort
  });

  // Consume teacher tracks
  const audioConsumer = await audioPlainTransport.consume({
    producerId: audioProducer.id,
    rtpCapabilities: router.rtpCapabilities
  });

  const videoConsumer = await videoPlainTransport.consume({
    producerId: videoProducer.id,
    rtpCapabilities: router.rtpCapabilities
  });

  // Dynamic RTP parameters mapping for SDP generation
  const audioPayloadType = audioConsumer.rtpParameters.codecs[0].payloadType;
  const audioCodecName = audioConsumer.rtpParameters.codecs[0].mimeType.split('/')[1];
  const audioClockRate = audioConsumer.rtpParameters.codecs[0].clockRate;
  const audioChannels = audioConsumer.rtpParameters.codecs[0].channels || 1;

  const videoPayloadType = videoConsumer.rtpParameters.codecs[0].payloadType;
  const videoCodecName = videoConsumer.rtpParameters.codecs[0].mimeType.split('/')[1];
  const videoClockRate = videoConsumer.rtpParameters.codecs[0].clockRate;

  // Create dynamic SDP content
  const sdpContent = `v=0
o=- 0 0 IN IP4 127.0.0.1
s=Mediasoup Classroom Recording
c=IN IP4 127.0.0.1
t=0 0
m=audio ${audioRtpPort} RTP/AVP ${audioPayloadType}
a=rtpmap:${audioPayloadType} ${audioCodecName}/${audioClockRate}/${audioChannels}
m=video ${videoRtpPort} RTP/AVP ${videoPayloadType}
a=rtpmap:${videoPayloadType} ${videoCodecName}/${videoClockRate}
`;

  const recordingsDir = path.resolve(process.env.RECORDINGS_DIR || './recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  const sdpPath = path.join(recordingsDir, `${roomCode}-${Date.now()}.sdp`);
  fs.writeFileSync(sdpPath, sdpContent);

  const filename = `${roomCode}-${Date.now()}.mp4`;
  const outputPath = path.join(recordingsDir, filename);

  // Spawn FFmpeg to read raw RTP streams and transcode to MP4 (libx264 / AAC)
  const ffmpegArgs = [
    '-loglevel', 'warning',
    '-protocol_whitelist', 'file,rtp,udp',
    '-i', sdpPath,
    '-c:a', 'aac',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-y',
    outputPath
  ];

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  ffmpegProcess.stderr.on('data', (data) => {
    console.log(`FFmpeg [${roomCode}]: ${data.toString().trim()}`);
  });

  ffmpegProcess.on('error', (err) => {
    console.error(`FFmpeg process failed to start for room ${roomCode}:`, err);
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg process for room ${roomCode} closed with code ${code}`);
    try {
      if (fs.existsSync(sdpPath)) {
        fs.unlinkSync(sdpPath);
      }
    } catch (e) {
      console.error('Error cleaning up SDP file:', e);
    }
  });

  activeRecordings.set(roomCode, {
    ffmpegProcess,
    sdpPath,
    outputPath,
    filename,
    audioPlainTransport,
    videoPlainTransport,
    audioConsumer,
    videoConsumer
  });

  console.log(`Started recording room ${roomCode}. Outputting to ${outputPath}`);
}

async function stopRecording(roomCode) {
  const rec = activeRecordings.get(roomCode);
  if (!rec) {
    throw new Error('No active recording for this room');
  }

  // Gracefully stop FFmpeg (SIGINT corresponds to Ctrl+C)
  rec.ffmpegProcess.kill('SIGINT');

  // Close plain consumers and transports
  rec.audioConsumer.close();
  rec.videoConsumer.close();
  rec.audioPlainTransport.close();
  rec.videoPlainTransport.close();

  activeRecordings.delete(roomCode);

  const downloadUrl = `/api/recordings/download/${rec.filename}`;
  const newRecording = new Recording({
    roomCode,
    filepath: rec.outputPath,
    downloadUrl
  });
  await newRecording.save();

  console.log(`Stopped recording room ${roomCode}. File saved: ${rec.filename}`);
  return downloadUrl;
}

module.exports = {
  startRecording,
  stopRecording,
  activeRecordings
};
