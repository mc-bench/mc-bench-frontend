import { useState } from 'react';
import { Share2, Flag, ChevronRight, ChevronLeft } from 'lucide-react';

const MCBench = () => {
    const [currentPair, setCurrentPair] = useState(0);
    const [voted, setVoted] = useState(false);

    const buildPairs = [
        {
            prompt: "Build a medieval castle with a moat and drawbridge",
            model_a: {
                name: "MineCraftGPT",
                image: "/api/placeholder/640/360",
                stats: {
                    blocks_used: 2456,
                    time_taken: "3.2s",
                    complexity_score: 0.85
                }
            },
            model_b: {
                name: "BlockBuilder-7B",
                image: "/api/placeholder/640/360",
                stats: {
                    blocks_used: 3102,
                    time_taken: "4.1s",
                    complexity_score: 0.92
                }
            }
        }
    ];

    const handleVote = (choice: 'A' | 'B') => {
        setVoted(true);
    };

    const currentBuildPair = buildPairs[currentPair];

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">MC-Bench</h1>
                <p className="text-gray-600">
                    Which AI generated this Minecraft build better?
                </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Prompt</span>
                    <span className="text-sm font-medium text-gray-600">Build #{currentPair + 1}</span>
                </div>
                <div className="mt-2">
                    <div className="bg-blue-50 text-blue-900 p-3 rounded-md text-center text-lg">
                        {currentBuildPair.prompt}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {[currentBuildPair.model_a, currentBuildPair.model_b].map((model, idx) => (
                        <div key={idx} className="relative">
                            <img
                                src={model.image}
                                alt={`Minecraft build ${idx === 0 ? 'A' : 'B'}`}
                                className="w-full rounded-lg bg-gray-200"
                            />
                            {voted && (
                                <div className="absolute top-2 left-2">
                                    <div className="bg-black/75 text-white px-3 py-1 rounded-md text-sm">
                                        {model.name}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {!voted ? (
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleVote('A')}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-md"
                        >
                            Vote Left
                        </button>
                        <button
                            onClick={() => handleVote('B')}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-md"
                        >
                            Vote Right
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {[currentBuildPair.model_a, currentBuildPair.model_b].map((model, idx) => (
                            <div key={idx} className="bg-white rounded-lg shadow-sm border p-4">
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div className="text-center">
                                        <div className="font-semibold">Blocks</div>
                                        <div>{model.stats.blocks_used}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold">Time</div>
                                        <div>{model.stats.time_taken}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold">Complexity</div>
                                        <div>{model.stats.complexity_score}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-between items-center pt-4">
                    <button className="p-2 rounded-full border hover:bg-gray-100">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex gap-2">
                        <button className="p-2 rounded-full border hover:bg-gray-100">
                            <Share2 className="h-4 w-4" />
                        </button>
                        <button className="p-2 rounded-full border hover:bg-gray-100">
                            <Flag className="h-4 w-4" />
                        </button>
                    </div>
                    <button className="p-2 rounded-full border hover:bg-gray-100">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MCBench; 