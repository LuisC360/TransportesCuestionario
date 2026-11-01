import { SessionModel } from "./sessions.model.js";

export class SessionsRepository {
  async create(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return SessionModel.create(data);
  }

  async findValidByTokenHash(tokenHash: string) {
    return SessionModel.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  }

  async deleteByTokenHash(tokenHash: string) {
    await SessionModel.deleteOne({ tokenHash });
  }

  async deleteForUserExcept(userId: string, sessionId?: string) {
    const filter = sessionId ? { userId, _id: { $ne: sessionId } } : { userId };
    await SessionModel.deleteMany(filter);
  }
}
