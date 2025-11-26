export interface StudentResponse {
  id: number;
  fullName: string;
  studentId: string;
  className: string;
  phone: string;
  address: string;
  photoBase64: string;
  photoUrl?: string; // if using file storage
  photoMetadata?: {
    width?: number;
    height?: number;
    size?: number;  // size in bytes
    quality?: number; // quality percentage (0-100)
    format?: string; // 'jpeg', 'png', etc.
  };
}
