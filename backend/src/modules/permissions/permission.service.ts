
import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

type Action = 'canView' | 'canDownload' | 'canEdit' | 'canDelete' | 'canManagePerms';

const MAX_FOLDER_DEPTH = 50;

@Injectable()
export class PermissionService {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS') private redis: any,
  ) {}

  /**
   * @param isFolder - pass true when `targetId` is a folderId rather than a fileId
   *   (e.g. checking "can I upload into this folder" before a file exists).
   */
  async can(userId: string, targetId: string, action: Action, isFolder = false): Promise<boolean> {
    const cacheKey = `perm:${userId}:${targetId}:${action}:${isFolder ? 'folder' : 'file'}`;
    try {
      const cached = await this.redis?.get(cacheKey);
      if (cached !== null && cached !== undefined) return cached === '1';
    } catch {
      // cache miss / redis unavailable - fall through to DB
    }

    let result: boolean;
    if (isFolder) {
      result = await this.canOnFolder(userId, targetId, action);
    } else {
      const file = await this.prisma.file.findUnique({ where: { id: targetId } });
      if (!file) throw new ForbiddenException('File not found');

      const filePerms = await this.prisma.permission.findMany({
        where: { fileId: targetId, OR: [{ userId }, { role: { users: { some: { userId } } } }] },
      });
      const direct = this.evaluate(filePerms, action);
      if (direct !== null) {
        result = direct;
      } else {
        result = await this.canOnFolder(userId, file.folderId, action);
      }
    }

    try {
      await this.redis?.setex(cacheKey, 60, result ? '1' : '0');
    } catch {
      // best-effort cache write
    }
    return result;
  }

  private async canOnFolder(userId: string, startFolderId: string | null, action: Action): Promise<boolean> {
    const visited = new Set<string>();
    let folderId = startFolderId;

    while (folderId) {
      if (visited.has(folderId)) {
        // Circular folder reference (parentId cycle) - fail closed, don't hang forever.
        throw new ForbiddenException(`Circular folder reference detected at ${folderId}`);
      }
      visited.add(folderId);
      if (visited.size > MAX_FOLDER_DEPTH) {
        throw new ForbiddenException(`Max folder depth (${MAX_FOLDER_DEPTH}) exceeded - possible cycle`);
      }

      const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder) break;

      const perms = await this.prisma.permission.findMany({
        where: { folderId, OR: [{ userId }, { role: { users: { some: { userId } } } }] },
      });
      const res = this.evaluate(perms, action);
      if (res !== null) return res;

      if (folder.breakInheritance) break;
      folderId = folder.parentId;
    }

    const isAdmin = await this.prisma.userRole.findFirst({
      where: { userId, role: { name: 'ADMIN' } },
    });
    return !!isAdmin;
  }

  /**
   * Invalidate all cached permission entries for a user on a given file/folder.
   * Uses SCAN (cursor-based, non-blocking) rather than KEYS, which blocks Redis
   * entirely on large keyspaces - the exact incident pattern this guards against.
   */
  async invalidateCache(userId: string, targetId: string): Promise<void> {
    if (!this.redis) return;
    const pattern = `perm:${userId}:${targetId}:*`;
    let cursor = '0';
    let totalDeleted = 0;
    try {
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');
    } catch {
      // best-effort - a stale cache entry expires on its own in 60s (see `can()`)
    }
  }

  private evaluate(perms: any[], action: Action): boolean | null {
    if (perms.length === 0) return null;
    // Explicit deny wins over any allow.
    if (perms.some((p) => p[action] === false)) return false;
    if (perms.some((p) => p[action] === true)) return true;
    return null;
  }
}
