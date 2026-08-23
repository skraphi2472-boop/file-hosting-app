import s3 from '../config/s3.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const bucket = process.env.AWS_S3_BUCKET || 'file-hosting-bucket';
const region = process.env.AWS_REGION || 'us-east-1';

export const uploadToS3 = async (file, userId) => {
  try {
    const key = `${userId}/${Date.now()}-${uuidv4()}-${file.originalname}`;
    
    const params = {
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256'
    };
    
    await s3.upload(params).promise();
    return key;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

export const getSignedUrl = async (s3Key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: bucket,
      Key: s3Key,
      Expires: expiresIn
    };
    
    return await s3.getSignedUrl('getObject', params);
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

export const deleteFromS3 = async (s3Key) => {
  try {
    const params = {
      Bucket: bucket,
      Key: s3Key
    };
    
    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw error;
  }
};

export const getFileMetadata = async (s3Key) => {
  try {
    const params = {
      Bucket: bucket,
      Key: s3Key
    };
    
    const response = await s3.headObject(params).promise();
    return {
      size: response.ContentLength,
      mimeType: response.ContentType,
      lastModified: response.LastModified
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw error;
  }
};
