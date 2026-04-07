import axios from "axios";

export async function fetchFirstProduct(_, context = {}) {
  const { dryRun = true } = context;

  if (dryRun) {
    return { simulated: true };
  }

  const { data } = await axios.get("https://dummyjson.com/products");

  if (!Array.isArray(data.products)) {
    throw new Error("Invalid API response: products is not an array");
  }

  if (!data.products.length) {
    throw new Error("No products found");
  }

  return data.products[0].id;
}
