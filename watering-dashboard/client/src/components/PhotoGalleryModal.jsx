import React from "react";
import "./PhotoGalleryModal.css";

export default function PhotoGalleryModal({ areaId, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Photo Gallery</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="gallery-empty">
          <i className="fas fa-image"></i>
          <p>No photos available for this area</p>
        </div>
      </div>
    </div>
  );
}
