import { useState } from 'react';
import { Trophy, ArrowUp, ArrowDown, Minus, Filter } from 'lucide-react';

const Leaderboard = () => {
    const [timeRange, setTimeRange] = useState('all');
    // const [category, setCategory] = useState('all'); // TODO: add category filter

    // Sample data - in a real app this would come from an API
    const leaderboardData = [
        {
            rank: 1,
            prevRank: 2,
            name: "MineCraftGPT-4",
            organization: "OpenAI",
            totalVotes: 124563,
            winRate: 0.76,
            categories: {
                castles: 0.82,
                houses: 0.71,
                landscapes: 0.75
            }
        },
        {
            rank: 2,
            prevRank: 1,
            name: "BlockBuilder-7B",
            organization: "Anthropic",
            totalVotes: 98452,
            winRate: 0.73,
            categories: {
                castles: 0.75,
                houses: 0.74,
                landscapes: 0.70
            }
        },
        {
            rank: 3,
            prevRank: 3,
            name: "CubeCreator-XL",
            organization: "Google",
            totalVotes: 87234,
            winRate: 0.69,
            categories: {
                castles: 0.68,
                houses: 0.72,
                landscapes: 0.67
            }
        },
        {
            rank: 4,
            prevRank: 5,
            name: "VoxelVirtuoso",
            organization: "DeepMind",
            totalVotes: 76123,
            winRate: 0.65,
            categories: {
                castles: 0.64,
                houses: 0.67,
                landscapes: 0.64
            }
        }
    ];

    const getRankChange = (current: number, previous: number) => {
        if (current < previous) {
            return <div className="flex items-center text-green-600">
                <ArrowUp className="h-4 w-4" />
                <span className="text-xs ml-1">{previous - current}</span>
            </div>;
        } else if (current > previous) {
            return <div className="flex items-center text-red-600">
                <ArrowDown className="h-4 w-4" />
                <span className="text-xs ml-1">{current - previous}</span>
            </div>;
        }
        return <Minus className="h-4 w-4 text-gray-400" />;
    };

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    <h2 className="text-2xl font-bold">Leaderboard</h2>
                </div>
                <div className="flex space-x-2">
                    <select
                        className="px-3 py-1 border rounded-md text-sm"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                    >
                        <option value="all">All Time</option>
                        <option value="month">This Month</option>
                        <option value="week">This Week</option>
                        <option value="day">Today</option>
                    </select>
                    <button className="px-3 py-1 border rounded-md text-sm flex items-center hover:bg-gray-50">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                    </button>
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b text-left"> {/* Applied to the entire row */}
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Rank</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Votes</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Castles</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Houses</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Landscapes</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                            {leaderboardData.map((model) => (
                                <tr key={model.name} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium text-gray-900 mr-2">#{model.rank}</span>
                                            {getRankChange(model.rank, model.prevRank)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{model.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{model.organization}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-gray-900">{model.totalVotes.toLocaleString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-gray-900">{(model.winRate * 100).toFixed(1)}%</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-gray-900">{(model.categories.castles * 100).toFixed(1)}%</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-gray-900">{(model.categories.houses * 100).toFixed(1)}%</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-gray-900">{(model.categories.landscapes * 100).toFixed(1)}%</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard; 