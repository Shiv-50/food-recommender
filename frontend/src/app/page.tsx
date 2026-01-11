"use client";
import { useEffect, useState } from "react";
import { Recommendation } from "@/types";
import { getSessionId } from "@/lib/session";
import { useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function Home() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | "super" | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchOffset, setTouchOffset] = useState({ x: 0, y: 0 });
  const router = useRouter();

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

  const swipe = (action: "left" | "right" | "super") => {
    const item = items[currentIndex];
    if (!item) return;
    
    setSwipeDirection(action);
    
    const sid = getSessionId();
    const type = encodeURIComponent(item.type);
    fetch(`${BACKEND_URL}/swipe/${sid}/${item.id}/${action}?item_type=${type}`, {
      method: "POST",
    }).then(() => {
      if(action == "super")
        return
      setTimeout(() => {
        setSwipeDirection(null);
        if (currentIndex + 1 < items.length) setCurrentIndex(currentIndex + 1);
        else fetchNext();
      }, 300);
    });
  };

  const superSwipe = async () => {
    const item = items[currentIndex];
    if (!item) return;

    const sid = getSessionId();
    const type = encodeURIComponent(item.type);

    await fetch(`${BACKEND_URL}/swipe/${sid}/${item.id}/super?item_type=${type}`, {
      method: "POST",
    });

    router.push("/session_stats");
  };

  // Touch handlers with vertical support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentTouch = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    const diff = {
      x: currentTouch.x - touchStart.x,
      y: currentTouch.y - touchStart.y
    };
    setTouchOffset(diff);
  };

  const handleTouchEnd = () => {
    const absX = Math.abs(touchOffset.x);
    const absY = Math.abs(touchOffset.y);
    
    // Check if swipe up for super like (y is negative when swiping up)
    if (touchOffset.y < -100 && absY > absX) {
      swipe("super");
      superSwipe();
    }
    // Horizontal swipes
    else if (absX > 100 && absX > absY) {
      if (touchOffset.x > 0) {
        swipe("right");
      } else {
        swipe("left");
      }
    }
    
    setTouchStart(null);
    setTouchOffset({ x: 0, y: 0 });
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
            ⬆️ Super Swipe
          </button>
        </div>
      </div>
    );
  }

  // Calculate transform based on swipe direction and touch offset
  let cardTransform = "translateX(0) translateY(0) rotate(0)";
  
  if (swipeDirection === "super") {
    cardTransform = "translateY(-600px) scale(1.2)";
  } else if (swipeDirection === "right") {
    cardTransform = "translateX(400px) rotate(20deg)";
  } else if (swipeDirection === "left") {
    cardTransform = "translateX(-400px) rotate(-20deg)";
  } else if (touchOffset.x !== 0 || touchOffset.y !== 0) {
    const absX = Math.abs(touchOffset.x);
    const absY = Math.abs(touchOffset.y);
    
    // Prioritize vertical movement for super swipe
    if (touchOffset.y < 0 && absY > absX) {
      cardTransform = `translateY(${touchOffset.y}px) scale(${1 + Math.abs(touchOffset.y) * 0.001})`;
    } else {
      cardTransform = `translateX(${touchOffset.x}px) rotate(${touchOffset.x * 0.05}deg)`;
    }
  }

  const cardOpacity = swipeDirection ? 0 : Math.max(0.5, 1 - Math.max(Math.abs(touchOffset.x), Math.abs(touchOffset.y)) / 300);

  // Determine if item has ingredients to show
  const hasIngredients = current.ingredients && current.ingredients.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
          🍽️ Food Swipe
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Swipe right to like, left to pass, up to super like
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
            {touchOffset.x > 50 && Math.abs(touchOffset.x) > Math.abs(touchOffset.y) && (
              <div className="absolute top-12 right-12 bg-green-500 text-white px-6 py-3 rounded-full font-bold text-xl transform rotate-12 shadow-lg">
                LIKE 👍
              </div>
            )}
            {touchOffset.x < -50 && Math.abs(touchOffset.x) > Math.abs(touchOffset.y) && (
              <div className="absolute top-12 left-12 bg-red-500 text-white px-6 py-3 rounded-full font-bold text-xl transform -rotate-12 shadow-lg">
                NOPE ❌
              </div>
            )}
            {touchOffset.y < -50 && Math.abs(touchOffset.y) > Math.abs(touchOffset.x) && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-8 py-4 rounded-full font-bold text-2xl shadow-lg">
                SUPER! ⭐
              </div>
            )}

            <div className="h-full flex flex-col">
              {/* Food Image */}
              <div className="relative h-64 w-full rounded-t-3xl overflow-hidden bg-gradient-to-br from-orange-100 to-pink-100">
                <img 
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop"
                  alt={current.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-between p-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-800 mb-3">
                    {current.name}
                  </h2>
                  
                  {hasIngredients && (
                    <div className="mt-4">
                      <p className="text-gray-500 text-sm mb-2">Ingredients:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {current.ingredients && current.ingredients.map((ing, i) => (
                          <span key={i} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center text-gray-400 text-sm mt-4">
                  {currentIndex + 1} / {items.length}
                </div>
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
            ⬆️
          </button>
          <button
            onClick={() => swipe("right")}
            className="bg-white text-green-500 w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 flex items-center justify-center text-2xl"
          >
            ✓
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm">
          Swipe or tap buttons • Swipe up for super like
        </p>
      </div>
    </div>
  );
}