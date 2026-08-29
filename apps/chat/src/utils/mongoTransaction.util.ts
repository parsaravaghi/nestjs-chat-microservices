import { ClientSession } from 'mongoose';

export const withTransaction = async <T>(
  session: ClientSession,
  callback: () => Promise<T>,
): Promise<T> => {
  try {
    session.startTransaction();

    const result = await callback();

    await session.commitTransaction();

    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
};
