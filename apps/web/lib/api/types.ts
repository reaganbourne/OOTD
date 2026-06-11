export type ApiFieldErrors = Record<string, string>;

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
      message: string;
      status: number;
    }
  | {
      ok: false;
      message: string;
      errors?: ApiFieldErrors;
      status: number;
    };

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  display_name?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
  current_streak?: number | null;
  longest_streak?: number | null;
  vibe_check_enabled?: boolean;
  ai_consent_accepted?: boolean;
  is_admin?: boolean;
};

export type AuthSessionResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type AuthRefreshResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type AuthLogoutResponse = {
  message: string;
};

export type OutfitClothingItem = {
  id: string;
  outfit_id: string;
  brand?: string | null;
  category: string;
  color?: string | null;
  display_order: number;
  link_url?: string | null;
  created_at: string;
};

export type OutfitResponse = {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string | null;
  event_name?: string | null;
  worn_on?: string | null;
  vibe_check_text?: string | null;
  vibe_check_tone?: string | null;
  created_at: string;
  updated_at: string;
  clothing_items: OutfitClothingItem[];
};

export type FeedAuthor = {
  id: string;
  username?: string | null;
  profile_image_url?: string | null;
};

export type FeedOutfitResponse = OutfitResponse & {
  author: FeedAuthor;
};

export type FeedPageResponse = {
  outfits: FeedOutfitResponse[];
  next_cursor?: string | null;
};

// ── Outfit detail ─────────────────────────────────────────────────────────────

export type OutfitOwner = {
  id: string;
  username: string | null;
  display_name: string | null;
  profile_image_url: string | null;
};

/** Full outfit detail — returned by GET /outfits/{id} */
export type OutfitDetailResponse = OutfitResponse & {
  owner: OutfitOwner;
};

export type VaultPage = {
  outfits: OutfitResponse[];
  next_cursor: string | null;
};

export type OutfitOG = {
  title: string;
  description: string;
  image_url: string;
  page_url: string;
  site_name: string;
  twitter_card: string;
};

export type CaptionSuggestions = {
  suggestions: string[];
};

// ── Likes & comments ──────────────────────────────────────────────────────────

export type LikeStatus = {
  like_count: number;
  liked: boolean;
};

export type CommentAuthor = {
  id: string;
  username: string | null;
  display_name: string | null;
  profile_image_url: string | null;
};

export type Comment = {
  id: string;
  outfit_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: CommentAuthor;
};

export type CommentPage = {
  comments: Comment[];
  next_cursor: string | null;
};

// ── Users ─────────────────────────────────────────────────────────────────────

export type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  instagram_handle?: string | null;
  follower_count: number;
  following_count: number;
  created_at: string;
};

export type FollowStatus = {
  following: boolean;
  follower_count: number;
};

export type UserSearchResult = {
  id: string;
  username: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  follower_count: number;
};

export type WrappedStats = {
  year: number;
  month: number;
  total_outfits: number;
  total_items: number;
  top_colors: Array<{ color: string; count: number }>;
  top_brands: Array<{ brand: string; count: number }>;
  top_categories: Array<{ category: string; count: number }>;
  longest_streak: number;
  current_streak: number;
  most_worn_vibe: string | null;
  outfits_by_week: Array<{ week: number; count: number }>;
};

// ── Boards ────────────────────────────────────────────────────────────────────

export type Board = {
  id: string;
  name: string;
  event_date: string | null;
  invite_code: string;
  creator_id: string;
  expires_at: string;
  member_count: number;
  created_at: string;
  media_link: string | null;
};

export type BoardMember = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  role: "creator" | "member";
  joined_at: string;
};

/** Board outfit — same as OutfitResponse but includes the uploader's author info */
export type BoardOutfitResponse = OutfitResponse & {
  author: FeedAuthor;
};

export type BoardOutfitPage = {
  outfits: BoardOutfitResponse[];
  next_cursor: string | null;
};

export type CreateOutfitInput = {
  image: File;
  metadata: {
    caption?: string;
    event_name?: string;
    worn_on?: string;
    clothing_items: Array<{
      brand?: string;
      category: string;
      color?: string;
      display_order: number;
      link_url?: string;
    }>;
    save_to_vault?: boolean;
  };
};
