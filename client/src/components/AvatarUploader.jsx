import { useEffect, useRef, useState } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function chooseFile(selectedFile) {
    setError("");
    setProgress(0);
    setUploadedUrl("");

    if (!selectedFile) return;

    if (!ALLOWED.includes(selectedFile.type)) {
      setFile(null);
      setPreviewUrl(null);
      setError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      setFile(null);
      setPreviewUrl(null);
      setError("The image must be 5MB or smaller.");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    chooseFile(e.dataTransfer.files[0]);
  }

  async function upload() {
    if (!file || isUploading) return;

    const formData = new FormData();
    formData.append("avatar", file);
    setError("");
    setProgress(0);
    setUploadedUrl("");
    setIsUploading(true);

    try {
      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });
      setUploadedUrl(response.data.url);
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.error ||
          uploadError.message ||
          "The upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div
        className={`drop-zone${isDragging ? " dragging" : ""}`}
        onClick={(e) => {
          if (e.target !== inputRef.current) inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
      >
        <p>Drag an image here, or click to choose</p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          hidden
          onChange={(e) => {
            chooseFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>

      {previewUrl && <img className="preview" src={previewUrl} alt="Avatar preview" />}
      {error && <p className="error">{error}</p>}

      {file && (
        <>
          <div
            className="bar"
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="fill" style={{ width: `${progress}%` }} />
          </div>
          <button onClick={upload} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </>
      )}

      {uploadedUrl && <p>Uploaded: {uploadedUrl}</p>}
    </div>
  );
}
