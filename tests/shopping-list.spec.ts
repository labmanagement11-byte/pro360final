import { test, expect } from '@playwright/test';

// Cambia la URL si tu app corre en otro puerto o dominio
const BASE_URL = 'http://localhost:3000';

test.describe('Dashboard funcionalidad básica', () => {
  test('Login y acceso a lista de compras', async ({ page }) => {
    await page.goto(BASE_URL);
    // Login con usuario de ejemplo
    await page.fill('input[name="username"]', 'Alejandra');
    await page.fill('input[name="password"]', 'vela123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/i);
    // Ir a lista de compras
    await page.click('text=Lista de Compras');
    await expect(page.locator('h2')).toHaveText(/Lista de Compras/);
  });

  test('Agregar producto a lista de compras', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('input[name="username"]', 'Alejandra');
    await page.fill('input[name="password"]', 'vela123');
    await page.click('button[type="submit"]');
    await page.click('text=Lista de Compras');
    await page.fill('input[placeholder="Producto por comprar"]', 'Café');
    await page.fill('input[type="number"]', '2');
    await page.click('button:has-text("Agregar")');
    await expect(page.locator('.dashboard-inventory-name')).toContainText('Café');
  });

  test('Eliminar producto de lista de compras', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('input[name="username"]', 'Alejandra');
    await page.fill('input[name="password"]', 'vela123');
    await page.click('button[type="submit"]');
    await page.click('text=Lista de Compras');
    // Eliminar el primer producto si existe
    const deleteBtn = page.locator('.dashboard-btn.danger', { hasText: 'Eliminar' }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await expect(deleteBtn).not.toBeVisible();
    }
  });
});
