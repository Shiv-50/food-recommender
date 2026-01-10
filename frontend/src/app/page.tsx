"use client";
import { useEffect, useState } from "react";
import { Recommendation } from "@/types";
import { getSessionId, resetSession } from "@/lib/session";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function Home() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sid = getSessionId();
    fetch(`${BACKEND_URL}/start/${sid}`)
      .then(res => res.json())
      .then(() => fetchNext());
  }, []);

  const fetchNext = () => {
    setLoading(true);
    const sid = getSessionId();
    fetch(`${BACKEND_URL}/next/${sid}`)
      .then(res => res.json())
      .then((data) => {
        setLoading(false);
        if (!data || Object.keys(data).length === 0) {
          setItems([]);
          return;
        }
        const nextItems = Array.isArray(data) ? data : [data];
        setItems(nextItems);
        setCurrentIndex(0);
      });
  };

  const swipe = (action: "left" | "right") => {
    const item = items[currentIndex];
    if (!item) return;
    const sid = getSessionId();
    const type = encodeURIComponent(item.type);
    fetch(`${BACKEND_URL}/swipe/${sid}/${item.id}/${action}?item_type=${type}`, {
      method: "POST",
    }).then(() => {
      if (currentIndex + 1 < items.length) setCurrentIndex(currentIndex + 1);
      else fetchNext();
    });
  };

  const superSwipe = () => {
    const sid = getSessionId();
    fetch(`${BACKEND_URL}/super/${sid}`, { method: "POST" }).then(() => {
      resetSession();
      location.reload();
    });
  };

  const current = items[currentIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl font-semibold">Loading recommendations...</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-xl font-semibold">No more recommendations!</p>
        <button
          onClick={superSwipe}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          Restart
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-xl shadow-lg text-center">
      <h1 className="text-3xl text-black mb-4">🍽 Food Recommender</h1>

      <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
        <h2 className="text-2xl text-black font-bold mb-2">{current.name}</h2>
        {current.type === "category" ? (
          <p className="text-blue-600 mb-4 font-medium">Category</p>
        ) : (
          <p className="text-green-600 mb-4">
            Ingredients: {current.ingredients?.join(", ") || "N/A"}
          </p>
        )}
      </div>

      <div className="flex justify-between mt-6 gap-4">
        <button
          onClick={() => swipe("left")}
          className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
        >
          ❌ Nope
        </button>
        <button
          onClick={() => swipe("right")}
          className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
        >
          👍 Like
        </button>
      </div>

      <button
        onClick={superSwipe}
        className="mt-4 w-full bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600 transition"
      >
        🚀 Super Swipe
      </button>

      <p className="mt-4 text-gray-500">
        {currentIndex + 1} / {items.length} in current batch
      </p>
    </div>
  );
}
