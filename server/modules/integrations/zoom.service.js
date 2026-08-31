const axios = require('axios');
const qs = require('qs');

class ZoomService {
  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.token = null;
    this.tokenExpiresAt = null;
  }

  async getAccessToken() {
    if (this.token && this.tokenExpiresAt && this.tokenExpiresAt > Date.now()) {
      return this.token;
    }

    try {
      const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const data = qs.stringify({
        grant_type: 'account_credentials',
        account_id: this.accountId,
      });

      const response = await axios.post('https://zoom.us/oauth/token', data, {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.token = response.data.access_token;
      // expire 5 mins before actual expiry just to be safe
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 300) * 1000;
      return this.token;
    } catch (error) {
      console.error('[ZOOM] Error fetching access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Zoom');
    }
  }

  async createMeeting(topic, startTime, duration, timezone = 'Asia/Kolkata') {
    try {
      const token = await this.getAccessToken();
      
      const meetingData = {
        topic: topic,
        type: 2, // 2 = Scheduled Meeting
        start_time: new Date(startTime).toISOString(),
        duration: duration, // in minutes
        timezone: timezone,
        settings: {
          host_video: true,
          participant_video: false,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 0, // Automatically approve
          audio: 'both',
          auto_recording: 'cloud' // Can be local, cloud, or none
        }
      };

      const response = await axios.post('https://api.zoom.us/v2/users/me/meetings', meetingData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        meetingId: response.data.id,
        joinUrl: response.data.join_url,
        startUrl: response.data.start_url,
        password: response.data.password
      };
    } catch (error) {
      console.error('[ZOOM] Error creating meeting:', error.response?.data || error.message);
      throw new Error('Failed to create Zoom meeting');
    }
  }
  async getMeetingParticipants(meetingId) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`https://api.zoom.us/v2/report/meetings/${meetingId}/participants`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          page_size: 300
        }
      });
      return response.data.participants || [];
    } catch (error) {
      console.error('[ZOOM] Error fetching participants:', error.response?.data || error.message);
      throw new Error('Failed to fetch Zoom meeting participants');
    }
  }
}

module.exports = new ZoomService();
