import { supabase } from './supabase'

export type FeedPost = {
  id: string; username: string; first_name: string | null; is_me: boolean; name: string; emoji: string; meal_type: string | null
  consumed_at: string; stars: number | null; prot: number | null; gluc: number | null; lip: number | null
  photo_path: string | null; thumb_path: string | null; reactions: Record<string, number>; my_reaction: string | null; comment_count: number
}
export type Relation = 'none' | 'friends' | 'pending_out' | 'pending_in'
export type FoundUser = { username: string; first_name: string | null; relation: Relation }
export type FriendRow = { username: string; first_name: string | null; avg7?: number | null; at?: string }
export type Overview = { friends: FriendRow[]; incoming: FriendRow[]; outgoing: FriendRow[]; blocked: FriendRow[] }
export type ProfileSummary = { username: string; first_name: string | null; self: boolean; friend_count: number; scores: { avg7: number | null; streak: number } }
export type SharedMeal = { id: string; name: string; emoji: string; meal_type: string | null; consumed_at: string; stars: number | null; thumb_path: string | null; photo_path: string | null }
export type Comment = { id: string; username: string; first_name: string | null; is_me: boolean; body: string; created_at: string; can_delete: boolean }

export const REACTIONS = ['🔥', '😋', '💪', '👏'] as const

export class SocialError extends Error {}
function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new SocialError(res.error.message.includes('rate_limited') ? 'Trop de requêtes, patiente un instant.' : 'Une erreur est survenue, réessaie.')
  return res.data as T
}

export const feedPage = async (before?: { at: string; id: string }, limit = 15) =>
  check(await supabase.rpc('feed_page', { p_before: before?.at ?? null, p_before_id: before?.id ?? null, p_limit: limit })) as FeedPost[]
export const react = async (meal: string, emoji: string) => check(await supabase.rpc('meal_react', { p_meal: meal, p_emoji: emoji })) as string | null
export const listComments = async (meal: string) => check(await supabase.rpc('meal_comments_list', { p_meal: meal })) as Comment[]
export const addComment = async (meal: string, body: string) => check(await supabase.rpc('meal_comment_add', { p_meal: meal, p_body: body }))
export const deleteComment = async (id: string) => check(await supabase.rpc('meal_comment_delete', { p_comment: id }))
export const hideMeal = async (meal: string) => check(await supabase.rpc('meal_hide', { p_meal: meal }))
export const reportMeal = async (meal: string, reason: 'inappropriate' | 'spam' | 'harassment' | 'other', comment?: string) =>
  check(await supabase.rpc('report_create', { p_meal: meal, p_comment: comment ?? null, p_reason: reason, p_details: null }))

export const searchUsers = async (q: string) => check(await supabase.rpc('search_users', { q })) as FoundUser[]
export const sendRequest = async (u: string) => check(await supabase.rpc('friend_request_send', { p_username: u })) as { ok: boolean; status?: Relation | 'friends'; reason?: string }
export const cancelRequest = async (u: string) => check(await supabase.rpc('friend_request_cancel', { p_username: u }))
export const respondRequest = async (u: string, accept: boolean) => check(await supabase.rpc('friend_request_respond', { p_username: u, p_accept: accept }))
export const removeFriend = async (u: string) => check(await supabase.rpc('friend_remove', { p_username: u }))
export const blockUser = async (u: string) => check(await supabase.rpc('user_block', { p_username: u }))
export const unblockUser = async (u: string) => check(await supabase.rpc('user_unblock', { p_username: u }))
export const overview = async () => check(await supabase.rpc('friends_overview')) as Overview
export const profileSummary = async (u: string) => check(await supabase.rpc('profile_summary', { p_username: u })) as ProfileSummary | null
export const sharedMeals = async (u: string, before?: string, limit = 24) =>
  check(await supabase.rpc('user_shared_meals', { p_username: u, p_before: before ?? null, p_limit: limit })) as SharedMeal[]

export const timeOf = (ts: string) => ts.slice(11, 16)
export const initialOf = (name?: string | null) => (name?.trim()[0] ?? '?').toUpperCase()
