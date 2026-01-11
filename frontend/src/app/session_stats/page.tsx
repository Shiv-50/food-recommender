"use client";
import { useEffect, useState } from "react";
import { getSessionId, resetSession } from "@/lib/session";
import { Stats } from "@/types";
import { useRouter } from "next/navigation";

const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";


export default function StatPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchStats = async () => {
        try {
            const sid = getSessionId();
            const res = await fetch(`${BACKEND_URL}/super/${sid}`, {
            method: "POST",
            });

            if (res.status === 404) {
            setStats(null);
            setLoading(false);
            return;
            }

            if (!res.ok) {
            throw new Error("Failed to fetch stats");
            }

            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error("Stats fetch error:", err);
            setStats(null);
        } finally {
            setLoading(false);
        }
        };
        fetchStats()

    }, []); 

    const handleReset = () =>
    {
            
        const sid = getSessionId();
        fetch(`${BACKEND_URL}/end_session/${sid}`, { method: "POST" }).then(() => {
        resetSession();
        router.push('/')
        });
       
    }

if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-orange-50">
                <div className="text-orange-600 text-lg">Loading your taste...</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-orange-50">
                <div className="w-50 text-center flex flex-col space-y-10">
                <p className="text-orange-800">No stats found</p>
                                <button
                    onClick={handleReset}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-full font-bold text-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
                >
                    🔄 Start Fresh
                </button>
                </div>
            </div>
        );
    }

    const leftPercent = stats.total_swipes > 0 ? (stats.left_swipes / stats.total_swipes) * 100 : 0;
    const rightPercent = stats.total_swipes > 0 ? (stats.right_swipes / stats.total_swipes) * 100 : 0;

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 p-6 flex items-center justify-center">
            <div className="w-full max-w-md">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-2">🍽️</div>
                    <h1 className="text-3xl font-bold text-orange-900 mb-1">Your Food Journey</h1>
                    <p className="text-orange-600">See what you've been craving</p>
                </div>

                {/* Total Swipes Card */}
                <div className="bg-white rounded-3xl shadow-lg p-8 mb-6 text-center border-2 border-orange-200">
                    <p className="text-orange-600 uppercase text-sm font-semibold tracking-wide mb-2">Total Swipes</p>
                    <p className="text-6xl font-bold text-orange-900">{stats.total_swipes}</p>
                    <p className="text-orange-500 mt-2">dishes rated</p>
                </div>

                {/* Visual Bar Chart */}
                <div className="bg-white rounded-3xl shadow-lg p-6 mb-6 border-2 border-orange-200">
                    <p className="text-orange-900 font-semibold mb-4 text-center">Your Taste Breakdown</p>
                    
                    {/* Horizontal stacked bar */}
                    <div className="relative h-20 bg-gray-100 rounded-full overflow-hidden mb-6">
                        <div 
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-400 to-red-500 flex items-center justify-center transition-all duration-700"
                            style={{ width: `${leftPercent}%` }}
                        >
                            {leftPercent > 15 && (
                                <span className="text-white font-bold text-lg">😝 {leftPercent.toFixed(0)}%</span>
                            )}
                        </div>
                        <div 
                            className="absolute right-0 top-0 h-full bg-gradient-to-l from-green-400 to-green-500 flex items-center justify-center transition-all duration-700"
                            style={{ width: `${rightPercent}%` }}
                        >
                            {rightPercent > 15 && (
                                <span className="text-white font-bold text-lg">😋 {rightPercent.toFixed(0)}%</span>
                            )}
                        </div>
                    </div>

                    {/* Individual bars */}
                    <div className="space-y-4">
                        {/* Nope bar */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">😝</span>
                                    <span className="font-semibold text-gray-700">Nope</span>
                                </div>
                                <span className="font-bold text-red-500 text-xl">{stats.left_swipes}</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700"
                                    style={{ width: `${leftPercent}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Yum bar */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">😋</span>
                                    <span className="font-semibold text-gray-700">Yum!</span>
                                </div>
                                <span className="font-bold text-green-500 text-xl">{stats.right_swipes}</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-700"
                                    style={{ width: `${rightPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className= "flex text-orange-600 bg-gray-100 rounded-2xl p-2 text-center shadow-lg mb-5">
                    <p className="w-full">{stats.insights}</p>
                </div>

                {/* Reset Button */}
                <button
                    onClick={handleReset}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-full font-bold text-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
                >
                    🔄 Start Fresh
                </button>

                <p className="text-center text-orange-400 text-sm mt-4">Ready for a new food adventure?</p>
            </div>
        </div>
    );
    }
