import { getVentas } from "../api.js";
import { renderCards } from "../ui/renderCards.js";
import { showSuccess, showError } from "./utils/alerts.js";

export async function initVentas() {
  try {
    const ventas = await getVentas();
    renderCards(ventas);
  } catch (err) {
    console.error("Error al cargar ventas:", err);
  }
}