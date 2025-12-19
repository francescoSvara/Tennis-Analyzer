function _findPointByPointRoot(obj) {
  if (!obj) return null;
  if (obj.pointByPoint) return obj.pointByPoint;
  if (obj.api) {
    for (const k of Object.keys(obj.api)) {
      if (obj.api[k] && obj.api[k].pointByPoint) return obj.api[k].pointByPoint;
    }
  }
  for (const k of Object.keys(obj)) {
    if (obj[k] && obj[k].pointByPoint) return obj[k].pointByPoint;
  }
  return null;
}

export function extractPointByPoint(raw) {
  const setsRaw = _findPointByPointRoot(raw);
  if (!setsRaw) return [];
  return setsRaw.map((s) => ({
    setNumber: s.set,
    games: (s.games || []).map((g) => ({
      gameNumber: g.game,
      score: g.score || {},
      points: (g.points || []).map((p) => ({
        homePoint: p.homePoint,
        awayPoint: p.awayPoint,
        pointDescription: p.pointDescription,
        homePointType: p.homePointType,
        awayPointType: p.awayPointType,
      })),
    })),
  }));
}

export default extractPointByPoint;
