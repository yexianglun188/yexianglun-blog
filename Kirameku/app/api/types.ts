export interface GitHubUser {
  id: number;
  login: string;
  avatar: string;
  bio: string;
}

/** 站点本地账号的公开信息（留言/评论作者） */
export interface SiteUser {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  is_guest: boolean;
}

/** 统一取作者展示名：本地账号优先，兼容历史 GitHub 数据 */
export function displayName(
  author?: { user?: SiteUser | null; github_user?: GitHubUser | null } | null
) {
  return author?.user?.nickname || author?.github_user?.login || "匿名用户";
}

/** 头像数据：本地账号直接用，历史 GitHub 数据映射成同样结构 */
export function avatarOf(
  author?: { user?: SiteUser | null; github_user?: GitHubUser | null } | null
) {
  if (author?.user) return author.user;
  if (author?.github_user)
    return {
      nickname: author.github_user.login,
      avatar: author.github_user.avatar,
    };
  return null;
}
