export type Booking = {
  id: string;
  name: string;
  phone: string;
  day: string;
  photo_package: string;
  video_option: string;
  status: 'En attente' | 'Confirmé' | 'Traité';
  created_at: string;
};
