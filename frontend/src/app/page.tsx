"use client";
import { useEffect, useState } from "react";
import { Recommendation } from "@/types";
import { getSessionId, resetSession } from "@/lib/session";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";


export default function Home() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchOffset, setTouchOffset] = useState(0);

  useEffect(() => {
      console.log("BACKEND_URL:", BACKEND_URL);
  console.log("Sending request to start session:", `${BACKEND_URL}/start/${sid}`);
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
    
    setSwipeDirection(action);
    
    const sid = getSessionId();
    const type = encodeURIComponent(item.type);
    fetch(`${BACKEND_URL}/swipe/${sid}/${item.id}/${action}?item_type=${type}`, {
      method: "POST",
    }).then(() => {
      setTimeout(() => {
        setSwipeDirection(null);
        if (currentIndex + 1 < items.length) setCurrentIndex(currentIndex + 1);
        else fetchNext();
      }, 300);
    });
  };

  const superSwipe = () => {
    const sid = getSessionId();
    fetch(`${BACKEND_URL}/super/${sid}`, { method: "POST" }).then(() => {
      resetSession();
      location.reload();
    });
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentTouch = e.touches[0].clientX;
    const diff = currentTouch - touchStart;
    setTouchOffset(diff);
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchOffset) > 100) {
      if (touchOffset > 0) {
        swipe("right");
      } else {
        swipe("left");
      }
    }
    setTouchStart(null);
    setTouchOffset(0);
  };

  const current = items[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-500 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-2xl font-bold text-gray-800 mb-2">All Done!</p>
          <p className="text-gray-600 mb-6">No more recommendations at the moment</p>
          <button
            onClick={superSwipe}
            className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all transform hover:scale-105"
          >
            🔄 Start Over
          </button>
        </div>
      </div>
    );
  }

  const cardTransform = swipeDirection 
    ? swipeDirection === "right" 
      ? "translateX(400px) rotate(20deg)" 
      : "translateX(-400px) rotate(-20deg)"
    : touchOffset 
      ? `translateX(${touchOffset}px) rotate(${touchOffset * 0.05}deg)`
      : "translateX(0) rotate(0)";

  const cardOpacity = swipeDirection ? 0 : Math.max(0.5, 1 - Math.abs(touchOffset) / 300);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
          🍽️ Food Swipe
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Swipe right to like, left to pass
        </p>

        {/* Card Stack */}
        <div className="relative h-[500px] mb-6">
          {/* Background cards for depth */}
          {items[currentIndex + 1] && (
            <div className="absolute inset-0 bg-white rounded-3xl shadow-lg transform scale-95 opacity-50"></div>
          )}
          {items[currentIndex + 2] && (
            <div className="absolute inset-0 bg-white rounded-3xl shadow-lg transform scale-90 opacity-25"></div>
          )}

          {/* Active Card */}
          <div
            className="absolute inset-0 bg-white rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing"
            style={{
              transform: cardTransform,
              opacity: cardOpacity,
              transition: swipeDirection ? "all 0.3s ease-out" : "none",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Swipe indicators */}
            {touchOffset > 50 && (
              <div className="absolute top-12 right-12 bg-green-500 text-white px-6 py-3 rounded-full font-bold text-xl transform rotate-12 shadow-lg">
                LIKE 👍
              </div>
            )}
            {touchOffset < -50 && (
              <div className="absolute top-12 left-12 bg-red-500 text-white px-6 py-3 rounded-full font-bold text-xl transform -rotate-12 shadow-lg">
                NOPE ❌
              </div>
            )}

            <div className="h-full flex flex-col p-8">
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">
                    {current.type === "category" ? "📁" : "🍴"}
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-3">
                    {current.name}
                  </h2>
                  {current.type === "category" ? (
                    <span className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-semibold">
                      Category
                    </span>
                  ) : (
                    <div className="mt-4">
                      <p className="text-gray-500 text-sm mb-2">Ingredients:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {current.ingredients?.map((ing, i) => (
                          <span key={i} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                            {ing}
                          </span>
                        )) || <span className="text-gray-400">N/A</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center text-gray-400 text-sm">
                {currentIndex + 1} / {items.length}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => swipe("left")}
            className="bg-white text-red-500 w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 flex items-center justify-center text-2xl"
          >
            ❌
          </button>
          <button
            onClick={superSwipe}
            className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 flex items-center justify-center text-2xl"
          >
            🔄
          </button>
          <button
            onClick={() => swipe("right")}
            className="bg-white text-green-500 w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 flex items-center justify-center text-2xl"
          >
            ✓
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm">
          Tap buttons or swipe the card
        </p>
      </div>
    </div>
  );
}