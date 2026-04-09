import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { captureDuck } from "../sdk/errorTracker.js";
import { useErrors } from "../context/errorsContext.js";

export default function ErrorTriggerServices() {
  const { fetchAllErrors } = useErrors();
  const navigate = useNavigate();
  const [showAddProductPopover, setShowAddProductPopover] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    title: "",
    price: "",
    category: "",
    stock: "",
    description: "",
    simulateError: false,
    triggerKnownBug: false,
  });

  const handleProductInput = (event) => {
    const { name, value } = event.target;
    setProductForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetProductForm = () => {
    setProductForm({
      title: "",
      price: "",
      category: "",
      stock: "",
      description: "",
      simulateError: false,
      triggerKnownBug: false,
    });
  };

  const triggerBackendError = async () => {
    try {
      await axios.get("http://localhost:8080/test-error");
    } catch (error) {
      console.error(error);
    } finally {
      await fetchAllErrors();
    }
  };

  const triggerBackendPromiseError = async () => {
    try {
      await axios.get("http://localhost:8080/test-promise-error");
    } catch (error) {
      console.error(error);
    } finally {
      await fetchAllErrors();
    }
  };

  const triggerFrontendError = async () => {
    try {
      const obj = null;
      return obj.name;
    } catch (err) {
      await captureDuck(err, { context: "myFunction" });
    } finally {
      await fetchAllErrors();
    }
  };

  const runTriggerAndGoDashboard = async (label, fn) => {
    await fn();
    toast.success(`${label} captured. Opening dashboard...`);
    navigate("/");
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    setIsSubmittingProduct(true);

    try {
      const payload = {
        title: productForm.title.trim(),
        price: Number(productForm.price),
        category: productForm.category.trim() || "general",
        stock: Number(productForm.stock || 0),
        description: productForm.description.trim(),
        simulateError: productForm.simulateError,
        triggerKnownBug: productForm.triggerKnownBug,
      };

      const { data } = await axios.post(
        "http://localhost:8080/products/add",
        payload,
      );

      toast.success(
        `Product "${data?.data?.title || payload.title}" added successfully`,
      );
      resetProductForm();
      setShowAddProductPopover(false);
      navigate("/");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingProduct(false);
      await fetchAllErrors();
    }
  };

  const actions = [
    {
      title: "Backend test error",
      description: "Hits /test-error to simulate a handled server failure.",
      onClick: () =>
        runTriggerAndGoDashboard("Backend test error", triggerBackendError),
    },
    {
      title: "Backend promise rejection",
      description: "Exercises /test-promise-error for async failure paths.",
      onClick: () =>
        runTriggerAndGoDashboard(
          "Backend promise rejection",
          triggerBackendPromiseError,
        ),
    },
    {
      title: "Frontend capture",
      description: "Throws in-browser and sends the payload through captureDuck.",
      onClick: () => runTriggerAndGoDashboard("Frontend error", triggerFrontendError),
    },
    {
      title: "Product workflow",
      description: "Open the modal to POST /products/add with replay flags.",
      onClick: () => setShowAddProductPopover(true),
    },
  ];

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Path: /error--trigger-services
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Error triggers
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Controlled ways to generate traffic for the dashboard. Each action
            refreshes the shared error index so you can jump back to the
            overview and inspect fingerprints, snippets, and replay.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {actions.map((a) => (
            <button
              key={a.title}
              type="button"
              onClick={a.onClick}
              className="text-left rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm ring-1 ring-zinc-900/[0.04] dark:ring-white/[0.05] transition hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-md hover:-translate-y-0.5"
            >
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {a.title}
              </p>
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {a.description}
              </p>
              <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Run trigger →
              </p>
            </button>
          ))}
        </div>
      </div>

      {showAddProductPopover && (
        <div className="fixed inset-0 bg-zinc-950/50 dark:bg-black/60 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Add product
              </h2>
              <button
                type="button"
                onClick={() => setShowAddProductPopover(false)}
                className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={submitProduct} className="space-y-3">
              <input
                name="title"
                value={productForm.title}
                onChange={handleProductInput}
                type="text"
                placeholder="Title"
                required
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />
              <input
                name="price"
                value={productForm.price}
                onChange={handleProductInput}
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                required
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />
              <input
                name="category"
                value={productForm.category}
                onChange={handleProductInput}
                type="text"
                placeholder="Category (optional)"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />
              <input
                name="stock"
                value={productForm.stock}
                onChange={handleProductInput}
                type="number"
                min="0"
                step="1"
                placeholder="Stock (optional)"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  name="simulateError"
                  checked={productForm.simulateError}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      simulateError: e.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                Simulate service failure (for replay)
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  name="triggerKnownBug"
                  checked={productForm.triggerKnownBug}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      triggerKnownBug: e.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                Trigger known backend bug (fix backend, then replay)
              </label>
              <textarea
                name="description"
                value={productForm.description}
                onChange={handleProductInput}
                rows={3}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductPopover(false)}
                  className="px-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-4 py-2 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                >
                  {isSubmittingProduct ? "Saving..." : "Save product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
