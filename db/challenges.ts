import {redis} from '@/lib/redis';

export type ChallengeRecord = {
  origin: string;
  challenge: string;
  id?: string;
  user?: string;
  timeout?: number;
};

export function getdel(challenge: string) {
  return redis.getdel<ChallengeRecord>(`challenge:${challenge}`);
}

export function set(challenge: ChallengeRecord) {
  return redis.set<ChallengeRecord>(`challenge:${challenge.challenge}`, challenge, {
    ex: Math.floor((challenge.timeout ?? 60000) / 1000),
    nx: true,
  });
}
