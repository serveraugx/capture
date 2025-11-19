export interface StudentResponse {
  id: number;
  fullName: string;
  studentId: string;
  className: string;
  phone: string;
  address: string;
  photoBase64: string;
  photoUrl?: string; // if using file storage
}
