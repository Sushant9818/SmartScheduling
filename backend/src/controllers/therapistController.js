import Therapist from "../models/Therapist.js";

export async function createTherapist(req, res) {
  try {
    const therapist = await Therapist.create(req.body);
    res.status(201).json(therapist);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function getTherapists(req, res) {
  try {
    const therapists = await Therapist.find().sort({ createdAt: -1 });
    res.json(therapists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getTherapistById(req, res) {
  try {
    const therapist = await Therapist.findById(req.params.id);
    if (!therapist) return res.status(404).json({ message: "Therapist not found" });
    res.json(therapist);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function updateAvailability(req, res) {
  try {
    const { weeklyAvailability } = req.body;
    const therapist = await Therapist.findByIdAndUpdate(
      req.params.id,
      { weeklyAvailability },
      { new: true }
    );
    if (!therapist) return res.status(404).json({ message: "Therapist not found" });
    res.json(therapist);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function addTimeOff(req, res) {
  try {
    const { start, end, reason } = req.body;
    const therapist = await Therapist.findById(req.params.id);
    if (!therapist) return res.status(404).json({ message: "Therapist not found" });

    therapist.timeOff.push({ start, end, reason });
    await therapist.save();

    res.json(therapist);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
