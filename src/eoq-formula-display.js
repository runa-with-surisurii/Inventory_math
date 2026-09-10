// EOQ formula display remains intentionally disabled.
// Load the single calculation engine after the main app so all displayed
// calculation results can use calculations.js without duplicating formulas.
import('../calculations.js').catch(error => console.error('KitchenIQ calculation engine failed to load:', error));
