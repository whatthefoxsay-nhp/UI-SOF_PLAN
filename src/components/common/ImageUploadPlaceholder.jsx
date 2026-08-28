import React, { useState } from 'react';
import { Upload, message, Modal } from 'antd';
import { Upload as UploadIcon, Trash2, Eye } from 'lucide-react';
import ProductImagePlaceholder from './ProductImagePlaceholder';
import { PLACEHOLDER_CONFIG } from '../../constants';
import { isValidImageFormat, isValidImageSize, resizeImage } from '../../utils/imageUtils';
import './ImageUploadPlaceholder.css';

const ImageUploadPlaceholder = ({
  value,
  onChange,
  fallbackText,
  size = 120,
  shape = 'rounded',
  variant = 'gradient',
  disabled = false,
  showUploadButton = true,
  showPreview = true,
  showDelete = true,
  maxSizeMB = 5,
  resizeOptions = {
    maxWidth: 800,
    maxHeight: 600,
    quality: 0.8
  },
  ...props
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file) => {
    try {
      setUploading(true);

      // Validate file format
      if (!isValidImageFormat(file)) {
        message.error('Chỉ hỗ trợ file ảnh (JPG, PNG, GIF, WebP)!');
        return false;
      }

      // Validate file size
      if (!isValidImageSize(file, maxSizeMB)) {
        message.error(`Kích thước file không được vượt quá ${maxSizeMB}MB!`);
        return false;
      }

      // Resize image if needed
      const resizedImage = await resizeImage(
        file,
        resizeOptions.maxWidth,
        resizeOptions.maxHeight,
        resizeOptions.quality
      );

      // Call onChange with the resized image data URL
      if (onChange) {
        onChange(resizedImage);
      }

      message.success('Upload hình ảnh thành công!');
      return false; // Prevent default upload behavior
    } catch (error) {
  // Silent console for UI component; user will see message error
      message.error('Có lỗi xảy ra khi upload hình ảnh!');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa hình ảnh này?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: () => {
        if (onChange) {
          onChange(null);
        }
        message.success('Đã xóa hình ảnh');
      }
    });
  };

  const handlePreview = () => {
    setPreviewVisible(true);
  };

  return (
    <div className="image-upload-placeholder" {...props}>
      <div className="image-upload-container">
        <ProductImagePlaceholder
          src={value}
          fallbackText={fallbackText}
          size={size}
          shape={shape}
          variant={variant}
          className={uploading ? 'uploading' : ''}
        />
        
        {!disabled && (
          <div className="image-upload-overlay">
            {showUploadButton && (
              <Upload
                showUploadList={false}
                beforeUpload={handleUpload}
                accept="image/*"
                disabled={uploading}
              >
                <div className="upload-button" title="Upload hình ảnh">
                  <UploadIcon size={18} />
                </div>
              </Upload>
            )}
            
            {value && showPreview && (
              <div className="preview-button" onClick={handlePreview} title="Xem hình ảnh">
                <Eye size={18} />
              </div>
            )}
            
            {value && showDelete && (
              <div className="delete-button" onClick={handleDelete} title="Xóa hình ảnh">
                <Trash2 size={18} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewVisible && value && (
        <Modal
          open={previewVisible}
          title="Xem trước hình ảnh"
          footer={null}
          onCancel={() => setPreviewVisible(false)}
          centered
        >
          <img
            src={value}
            alt="Preview"
            style={{
              width: '100%',
              maxHeight: '70vh',
              objectFit: 'contain'
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default ImageUploadPlaceholder;