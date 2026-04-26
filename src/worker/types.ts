type AssetFetcher = {
  fetch(request: Request): Promise<Response>;
};

export type Env = {
  ASSETS: AssetFetcher;
  JWT_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_URL?: string;
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  bio?: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type PostRow = {
  id: string;
  author_id: string;
  content: string;
  images?: unknown;
  attachment_name?: string;
  category?: string;
  shares?: number;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  title: string;
  description?: string;
  author_id: string;
  data_snapshot: string;
  status: 'draft' | 'completed' | 'approved';
  tags?: unknown;
  created_at: string;
  updated_at: string;
};

export type JwtPayload = {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  exp?: number;
};

export const USER_SELECT = 'id, name, email, avatar, bio, role, status, created_at';
export const USER_SELECT_WITH_PASSWORD = 'id, name, email, password, avatar, bio, role, status, created_at';
export const POST_SELECT = 'id, author_id, content, images, attachment_name, category, shares, created_at';
export const DOCUMENT_SELECT = 'id, title, description, author_id, data_snapshot, status, tags, created_at, updated_at';
