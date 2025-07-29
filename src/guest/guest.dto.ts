export type TQueryGetBanners = {
  id: string;
  title: string;
  redirect_url: string;
  description: string;
  image_url: string;
  image_text: string;
  type: string;
  priority: number;
  position: string;
  is_blank: boolean;
  updated_at: string | Date;
};
