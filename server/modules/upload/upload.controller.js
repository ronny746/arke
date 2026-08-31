const { s3Client, bucketName } = require('../../config/s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs');

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const isVideo = req.file.mimetype.startsWith('video/');
        const isAudio = req.file.mimetype.startsWith('audio/');
        const isImage = req.file.mimetype.startsWith('image/');

        let subfolder = 'others';
        if (isVideo) subfolder = 'videos';
        else if (isAudio) subfolder = 'audios';
        else if (isImage) subfolder = 'images';
        else subfolder = 'documents'; // PDF, DOCX, etc.

        const localPath = req.file.path;
        const fileName = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
        
        // Using instituteId for better isolation if available, otherwise general folder
        const instituteId = req.user ? req.user.instituteId : 'general';
        const folder = `institutes/${instituteId}/${subfolder}`;
        const key = `${folder}/${fileName}`;

        console.log(`[S3] Uploading ${req.file.mimetype} to S3: ${key}`);

        const fileStream = fs.createReadStream(localPath);

        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: bucketName,
                Key: key,
                Body: fileStream,
                ContentType: req.file.mimetype,
                // ACL: 'public-read' // Not using ACL as modern S3 buckets disable it by default. Bucket policies should handle public access if needed.
            },
        });

        await upload.done();

        // Cleanup local file after upload
        if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
            console.log(`[S3] Cleaned up local file: ${localPath}`);
        }

        const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        res.status(200).json({
            success: true,
            message: 'Media uploaded successfully to S3',
            data: {
                url: s3Url,
                fileId: key,
                fileType: isVideo ? 'video' : (isAudio ? 'audio' : (isImage ? 'image' : 'document')),
                fileSize: req.file.size || 0
            }
        });

    } catch (err) {
        console.error('[S3 ERROR] Upload failed:', err.message);

        // Ensure local cleanup even on failure
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ success: false, error: `S3 Upload Error: ${err.message}` });
    }
};
