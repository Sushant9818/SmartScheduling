import { findSlots, rankSlots } from "../services/schedulingService.js";

export async function suggestSlots(req, res) {
  try {
    const requestedClientId = req.body.clientId;
    const clientId = req.user?.role === "client" ? req.user.clientId : requestedClientId;
    if (!clientId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { therapistId, from, to, sessionMinutes } = req.body;

    const { client, slots } = await findSlots({
      clientId,
      therapistId,
      from: new Date(from),
      to: new Date(to),
      sessionMinutes: sessionMinutes || 60
    });

    const ranked = rankSlots(slots, { client });

    res.json({
      total: ranked.length,
      rankedSlots: ranked.slice(0, 20) // return top 20
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
