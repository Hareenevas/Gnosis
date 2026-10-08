const User = require('../models/User');
const Attempt = require('../models/Attempt');
const Friendship = require('../models/Friendship');

const BADGES = {
  'first-steps': 'First Steps: answered a question',
  'sharpshooter': 'Sharpshooter: 20 correct answers',
  'on-fire': 'On Fire: 3-day streak',
  'scholar': 'Scholar: 500 XP',
  'social-learner': 'Social Learner: made a friend',
  'boss-slayer': 'Boss Slayer: defeated a boss',
  'duelist': 'Duelist: won a 1v1 duel',
  'team-player': 'Team Player: finished a co-op game'
};
exports.BADGES = BADGES;

// Computes badges from stats (plus any event badges passed in) and saves new ones.
exports.award = async (userId, extra = []) => {
  const user = await User.findById(userId);
  const [attempts, correct, friends] = await Promise.all([
    Attempt.countDocuments({ user: userId }),
    Attempt.countDocuments({ user: userId, correct: true }),
    Friendship.countDocuments({ status: 'accepted', $or: [{ from: userId }, { to: userId }] })
  ]);
  const earned = [...extra];
  if (attempts >= 1) earned.push('first-steps');
  if (correct >= 20) earned.push('sharpshooter');
  if (user.streak >= 3) earned.push('on-fire');
  if (user.xp >= 500) earned.push('scholar');
  if (friends >= 1) earned.push('social-learner');
  const fresh = [...new Set(earned)].filter(id => BADGES[id] && !user.badges.includes(id));
  if (fresh.length) { user.badges.push(...fresh); await user.save(); }
  return user;
};
