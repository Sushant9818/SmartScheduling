import Client from "../models/Client.js";

function canAccessClient(req, clientId) {
  if (req.user?.role === "admin") return true;
  return req.user?.role === "client" && req.user?.clientId === String(clientId);
}

export async function createClient(req, res) {
  try {
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function listClients(req, res) {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getClientById(req, res) {
  try {
    if (!canAccessClient(req, req.params.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function updateClientPreferences(req, res) {
  try {
    if (!canAccessClient(req, req.params.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { preferences } = req.body;
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { preferences },
      { new: true }
    );
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
