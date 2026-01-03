import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, TrendingUp, Calendar, Target, MessageSquare, Plus, Trash2, Edit2, Check, X, BarChart3, PieChart, Award, Download, Bell, Clock, Zap, Star, Upload } from 'lucide-react';

export default function ResolutionTracker() {
  const [resolutions, setResolutions] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMilestones, setShowMilestones] = useState({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [errors, setErrors] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const chatEndRef = useRef(null);

  // Load resolutions from storage
  useEffect(() => {
    loadResolutions();
    
    // Online/offline detection
    const handleOnline = () => {
      setIsOnline(true);
      processOfficePendingUpdates();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addError = (message) => {
    const error = { id: Date.now(), message, timestamp: new Date() };
    setErrors(prev => [...prev.slice(-4), error]);
    setTimeout(() => {
      setErrors(prev => prev.filter(e => e.id !== error.id));
    }, 5000);
  };

  const processOfficePendingUpdates = async () => {
    if (pendingUpdates.length === 0) return;
    
    for (const update of pendingUpdates) {
      try {
        await handleNaturalLanguageInput(update.input, true);
      } catch (error) {
        console.error('Failed to process pending update:', error);
      }
    }
    setPendingUpdates([]);
  };

  const loadResolutions = async () => {
    try {
      const result = await window.storage.get('resolutions-data');
      if (result?.value) {
        setResolutions(JSON.parse(result.value));
      }
      
      // Load pending updates
      const pendingResult = await window.storage.get('pending-updates');
      if (pendingResult?.value) {
        setPendingUpdates(JSON.parse(pendingResult.value));
      }
    } catch (error) {
      addError('Failed to load your data. Please refresh and try again.');
      console.log('No existing resolutions found');
    } finally {
      setIsLoading(false);
    }
  };

  const saveResolutions = async (data) => {
    try {
      await window.storage.set('resolutions-data', JSON.stringify(data));
    } catch (error) {
      addError('Failed to save your progress. Please try again.');
      console.error('Failed to save:', error);
    }
  };

  const savePendingUpdates = async (updates) => {
    try {
      await window.storage.set('pending-updates', JSON.stringify(updates));
    } catch (error) {
      console.error('Failed to save pending updates:', error);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiResponse]);

  const handleNaturalLanguageInput = async (customInput = null, skipOfflineCheck = false) => {
    const userInput = customInput || input.trim();
    if (!userInput || isProcessing) return;

    if (!customInput) setInput('');
    setIsProcessing(true);
    setAiResponse('');

    // Handle offline mode
    if (!isOnline && !skipOfflineCheck) {
      const pendingUpdate = { 
        input: userInput, 
        timestamp: new Date().toISOString() 
      };
      const newPending = [...pendingUpdates, pendingUpdate];
      setPendingUpdates(newPending);
      await savePendingUpdates(newPending);
      setAiResponse("You're offline! I've saved your update and will process it when you're back online.");
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `You are a supportive AI coach helping someone track their personal resolutions. Current resolutions: ${JSON.stringify(resolutions)}

User input: "${userInput}"

Analyze the input and respond with JSON ONLY (no markdown, no preamble):

{
  "action": "add" | "update" | "check-in" | "motivate" | "analyze",
  "resolutionId": "string or null",
  "data": {
    "title": "string (for add)",
    "category": "health" | "career" | "personal" | "finance" | "learning" | "relationships" (for add)",
    "updateText": "string (for update)",
    "progressDelta": number (for update, -100 to 100),
    "message": "string (encouraging response to user)"
  }
}

Guidelines:
- "add": User wants to create a new resolution
- "update": User is logging progress on an existing resolution (use resolutionId)
- "check-in": User wants status update on all resolutions
- "motivate": User needs encouragement
- "analyze": User asks for insights about their progress

Be encouraging, specific, and constructive. Match the user's energy.`
            }
          ],
        })
      });

      const data = await response.json();
      const text = data.content.map(i => i.text || "").join("\n");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      let updatedResolutions = [...resolutions];

      if (parsed.action === 'add' && parsed.data.title) {
        const newResolution = {
          id: Date.now().toString(),
          title: parsed.data.title,
          category: parsed.data.category || 'personal',
          progress: 0,
          createdAt: new Date().toISOString(),
          updates: [],
          milestones: []
        };
        updatedResolutions = [...updatedResolutions, newResolution];
        setResolutions(updatedResolutions);
        await saveResolutions(updatedResolutions);
      } else if (parsed.action === 'update' && parsed.resolutionId) {
        updatedResolutions = updatedResolutions.map(res => {
          if (res.id === parsed.resolutionId) {
            const newProgress = Math.max(0, Math.min(100, res.progress + (parsed.data.progressDelta || 0)));
            return {
              ...res,
              progress: newProgress,
              updates: [...res.updates, {
                text: parsed.data.updateText || userInput,
                date: new Date().toISOString(),
                progressChange: parsed.data.progressDelta
              }]
            };
          }
          return res;
        });
        setResolutions(updatedResolutions);
        await saveResolutions(updatedResolutions);
      }

      setAiResponse(parsed.data.message || "I'm here to support your journey!");
    } catch (error) {
      console.error('AI Error:', error);
      if (error.name === 'TypeError' && !navigator.onLine) {
        setAiResponse("Connection lost. I'll save your update and try again when you're back online.");
        const pendingUpdate = { 
          input: userInput, 
          timestamp: new Date().toISOString() 
        };
        const newPending = [...pendingUpdates, pendingUpdate];
        setPendingUpdates(newPending);
        await savePendingUpdates(newPending);
      } else {
        addError("AI service temporarily unavailable. Please try again later.");
        setAiResponse("I had trouble processing that. Could you try rephrasing?");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    const updated = resolutions.filter(r => r.id !== id);
    setResolutions(updated);
    await saveResolutions(updated);
  };

  const handleEdit = (resolution) => {
    setEditingId(resolution.id);
    setEditText(resolution.title);
  };

  const saveEdit = async () => {
    const updated = resolutions.map(r => 
      r.id === editingId ? { ...r, title: editText } : r
    );
    setResolutions(updated);
    await saveResolutions(updated);
    setEditingId(null);
    setEditText('');
  };

  const getCategoryColor = (category) => {
    const colors = {
      health: '#10b981',
      career: '#3b82f6',
      personal: '#8b5cf6',
      finance: '#f59e0b',
      learning: '#ec4899',
      relationships: '#ef4444'
    };
    return colors[category] || '#6b7280';
  };

  const getCategoryIcon = (category) => {
    return category.charAt(0).toUpperCase();
  };

  const getProgressMessage = (progress) => {
    if (progress < 20) return "Just getting started";
    if (progress < 40) return "Building momentum";
    if (progress < 60) return "Making solid progress";
    if (progress < 80) return "Getting close!";
    return "Almost there!";
  };

  const resetAllData = async () => {
    if (window.confirm('This will delete all your resolutions and start fresh. Are you sure?')) {
      setResolutions([]);
      await saveResolutions([]);
      setAiResponse('');
    }
  };

  const getAnalytics = () => {
    if (resolutions.length === 0) return null;
    
    const totalResolutions = resolutions.length;
    const avgProgress = resolutions.reduce((sum, r) => sum + r.progress, 0) / totalResolutions;
    const categoryCounts = resolutions.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {});
    const totalUpdates = resolutions.reduce((sum, r) => sum + r.updates.length, 0);
    const activeResolutions = resolutions.filter(r => r.progress > 0 && r.progress < 100).length;
    const completedResolutions = resolutions.filter(r => r.progress === 100).length;
    const categoryProgress = Object.keys(categoryCounts).map(cat => ({
      category: cat,
      count: categoryCounts[cat],
      avgProgress: resolutions.filter(r => r.category === cat)
        .reduce((sum, r) => sum + r.progress, 0) / categoryCounts[cat]
    }));

    // Trend analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentUpdates = resolutions.flatMap(r => 
      r.updates.filter(u => new Date(u.date) > thirtyDaysAgo)
    );
    const weeklyUpdates = resolutions.flatMap(r => 
      r.updates.filter(u => new Date(u.date) > sevenDaysAgo)
    );
    
    const momentum = weeklyUpdates.length > 0 ? 'High' : 
                    recentUpdates.length > 0 ? 'Medium' : 'Low';
    
    // Recommendations
    const recommendations = [];
    const stagnantGoals = resolutions.filter(r => 
      r.updates.length === 0 || 
      (r.updates.length > 0 && new Date(r.updates[r.updates.length - 1].date) < sevenDaysAgo)
    );
    
    if (stagnantGoals.length > 0) {
      recommendations.push(`You have ${stagnantGoals.length} goals that need attention. Consider updating them!`);
    }
    
    if (avgProgress < 30 && totalResolutions > 1) {
      recommendations.push("Focus on fewer goals to make better progress. Quality over quantity!");
    }
    
    if (completedResolutions === 0 && avgProgress > 80) {
      recommendations.push("You're so close! Push through to complete your first goal.");
    }
    
    const bestCategory = categoryProgress.reduce((best, cat) => 
      cat.avgProgress > best.avgProgress ? cat : best, categoryProgress[0]);
    
    if (bestCategory && bestCategory.avgProgress > avgProgress) {
      recommendations.push(`${bestCategory.category.charAt(0).toUpperCase() + bestCategory.category.slice(1)} goals are your strength! Apply those strategies to other areas.`);
    }
    
    return {
      totalResolutions,
      avgProgress,
      categoryCounts,
      totalUpdates,
      activeResolutions,
      completedResolutions,
      categoryProgress,
      momentum,
      recommendations,
      recentActivity: recentUpdates.length,
      weeklyActivity: weeklyUpdates.length
    };
  };

  const exportData = (format) => {
    const data = {
      resolutions,
      exportDate: new Date().toISOString(),
      analytics: getAnalytics()
    };
    
    let content, filename, type;
    
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      filename = `resolutions-${new Date().toISOString().split('T')[0]}.json`;
      type = 'application/json';
    } else if (format === 'csv') {
      const headers = ['Title', 'Category', 'Progress', 'Created Date', 'Last Update', 'Updates Count'];
      const rows = resolutions.map(r => [
        `"${r.title.replace(/"/g, '""')}"`,
        r.category,
        r.progress,
        new Date(r.createdAt).toLocaleDateString(),
        r.updates.length > 0 ? new Date(r.updates[r.updates.length - 1].date).toLocaleDateString() : 'None',
        r.updates.length
      ]);
      content = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      filename = `resolutions-${new Date().toISOString().split('T')[0]}.csv`;
      type = 'text/csv';
    }
    
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addMilestone = async (resolutionId, milestone) => {
    const updatedResolutions = resolutions.map(res => {
      if (res.id === resolutionId) {
        return {
          ...res,
          milestones: [...(res.milestones || []), {
            id: Date.now().toString(),
            text: milestone,
            completed: false,
            createdAt: new Date().toISOString()
          }]
        };
      }
      return res;
    });
    setResolutions(updatedResolutions);
    await saveResolutions(updatedResolutions);
  };

  const toggleMilestone = async (resolutionId, milestoneId) => {
    const updatedResolutions = resolutions.map(res => {
      if (res.id === resolutionId) {
        return {
          ...res,
          milestones: res.milestones.map(m => 
            m.id === milestoneId ? { ...m, completed: !m.completed } : m
          )
        };
      }
      return res;
    });
    setResolutions(updatedResolutions);
    await saveResolutions(updatedResolutions);
  };

  const backupData = () => {
    const backup = {
      resolutions,
      pendingUpdates,
      version: '1.0',
      createdAt: new Date().toISOString()
    };
    
    const content = JSON.stringify(backup, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resolutions-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restoreData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        
        if (backup.version && backup.resolutions) {
          const confirmed = window.confirm(
            `This will replace all your current data with the backup from ${new Date(backup.createdAt).toLocaleDateString()}. Are you sure?`
          );
          
          if (confirmed) {
            setResolutions(backup.resolutions || []);
            setPendingUpdates(backup.pendingUpdates || []);
            await saveResolutions(backup.resolutions || []);
            await savePendingUpdates(backup.pendingUpdates || []);
            setAiResponse('Data restored successfully from backup!');
          }
        } else {
          addError('Invalid backup file format.');
        }
      } catch (error) {
        addError('Failed to restore backup. Please check the file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl font-light">Loading your journey...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Work+Sans:wght@300;400;500;600&display=swap');
        
        * {
          font-family: 'Work Sans', sans-serif;
        }
        
        .title-font {
          font-family: 'Playfair Display', serif;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); }
          50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.8); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .resolution-card {
          animation: slideIn 0.4s ease-out;
        }
        
        .progress-bar {
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .input-glow:focus {
          animation: pulse-glow 2s infinite;
        }
        
        .sparkle {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="inline-block sparkle mb-4">
            <Sparkles className="w-16 h-16 text-purple-400" />
          </div>
          <h1 className="title-font text-7xl font-black mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Resolution Tracker
          </h1>
          <p className="text-xl text-purple-200 font-light">
            Your AI-powered companion for achieving greatness in 2026
          </p>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="fixed top-4 right-4 space-y-2 z-50">
            {errors.map(error => (
              <div key={error.id} className="bg-red-500/20 backdrop-blur-lg border border-red-500/50 text-red-200 px-4 py-3 rounded-lg shadow-lg animate-slideIn">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4" />
                  <span className="text-sm">{error.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Offline Indicator */}
        {!isOnline && (
          <div className="fixed bottom-4 left-4 bg-orange-500/20 backdrop-blur-lg border border-orange-500/50 text-orange-200 px-4 py-3 rounded-lg shadow-lg z-50">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Offline mode - updates will sync when reconnected</span>
              {pendingUpdates.length > 0 && (
                <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full ml-2">
                  {pendingUpdates.length} pending
                </span>
              )}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex justify-center space-x-1 bg-white/10 backdrop-blur-lg rounded-2xl p-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Target },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'chat', label: 'AI Coach', icon: MessageSquare }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Dashboard */}
        {activeTab === 'analytics' && (
          <div className="max-w-6xl mx-auto mb-12">
            {getAnalytics() ? (
              <div className="space-y-8">
                {/* Export Controls */}
                <div className="flex justify-between items-center">
                  <h2 className="title-font text-4xl font-bold">Analytics & Insights</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportData('json')}
                      className="flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      JSON
                    </button>
                    <button
                      onClick={() => exportData('csv')}
                      className="flex items-center gap-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                    <button
                      onClick={backupData}
                      className="flex items-center gap-2 bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg hover:bg-purple-500/30 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Backup
                    </button>
                    <label className="flex items-center gap-2 bg-orange-500/20 text-orange-300 px-4 py-2 rounded-lg hover:bg-orange-500/30 transition-colors cursor-pointer">
                      <Upload className="w-4 h-4" />
                      Restore
                      <input
                        type="file"
                        accept=".json"
                        onChange={restoreData}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {(() => {
                  const analytics = getAnalytics();
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Overview Stats */}
                      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                          <Target className="w-8 h-8 text-purple-400" />
                          <h3 className="text-lg font-semibold">Total Goals</h3>
                        </div>
                        <p className="text-3xl font-bold text-purple-300">{analytics.totalResolutions}</p>
                      </div>

                      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                          <TrendingUp className="w-8 h-8 text-green-400" />
                          <h3 className="text-lg font-semibold">Avg Progress</h3>
                        </div>
                        <p className="text-3xl font-bold text-green-300">{Math.round(analytics.avgProgress)}%</p>
                      </div>

                      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                          <Zap className="w-8 h-8 text-yellow-400" />
                          <h3 className="text-lg font-semibold">Active Goals</h3>
                        </div>
                        <p className="text-3xl font-bold text-yellow-300">{analytics.activeResolutions}</p>
                      </div>

                      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                          <Award className="w-8 h-8 text-gold-400" />
                          <h3 className="text-lg font-semibold">Completed</h3>
                        </div>
                        <p className="text-3xl font-bold text-yellow-400">{analytics.completedResolutions}</p>
                      </div>

                      {/* Category Breakdown */}
                      <div className="md:col-span-2 bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                          <PieChart className="w-6 h-6" />
                          Category Breakdown
                        </h3>
                        <div className="space-y-3">
                          {analytics.categoryProgress.map(cat => (
                            <div key={cat.category} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: getCategoryColor(cat.category) }}
                                />
                                <span className="capitalize">{cat.category}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-purple-300">{cat.count} goals</div>
                                <div className="font-semibold">{Math.round(cat.avgProgress)}% avg</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Activity Summary */}
                      <div className="md:col-span-2 bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                          <Calendar className="w-6 h-6" />
                          Activity Summary
                        </h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Total Updates</span>
                            <span className="font-bold text-purple-300">{analytics.totalUpdates}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Avg Updates per Goal</span>
                            <span className="font-bold text-purple-300">
                              {Math.round(analytics.totalUpdates / analytics.totalResolutions * 10) / 10}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Completion Rate</span>
                            <span className="font-bold text-purple-300">
                              {Math.round(analytics.completedResolutions / analytics.totalResolutions * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div className="lg:col-span-4 bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                          <Zap className="w-6 h-6" />
                          AI Recommendations
                        </h3>
                        {analytics.recommendations.length > 0 ? (
                          <div className="space-y-3">
                            {analytics.recommendations.map((rec, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                                <Star className="w-4 h-4 text-yellow-400 mt-1 flex-shrink-0" />
                                <p className="text-sm text-white/80">{rec}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-purple-300">You're doing great! Keep up the momentum.</p>
                        )}
                        
                        <div className="mt-6 pt-4 border-t border-white/10">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-purple-300">Current Momentum</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              analytics.momentum === 'High' ? 'bg-green-500/20 text-green-300' :
                              analytics.momentum === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-red-500/20 text-red-300'
                            }`}>
                              {analytics.momentum}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-purple-300">This Week</span>
                              <p className="font-semibold">{analytics.weeklyActivity} updates</p>
                            </div>
                            <div>
                              <span className="text-purple-300">This Month</span>
                              <p className="font-semibold">{analytics.recentActivity} updates</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-16">
                <BarChart3 className="w-20 h-20 mx-auto mb-6 text-purple-400 opacity-50" />
                <h3 className="title-font text-3xl font-bold mb-4">No Data Yet</h3>
                <p className="text-lg text-purple-200">
                  Create some resolutions to see your analytics and insights here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* AI Chat Interface */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
              <div className="flex items-start gap-4">
                <MessageSquare className="w-6 h-6 mt-1 text-purple-300 flex-shrink-0" />
                <div className="flex-grow">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleNaturalLanguageInput();
                      }
                    }}
                    placeholder="Talk to your AI coach... Try: 'I want to run a marathon this year' or 'I ran 5k today!' or 'How am I doing?'"
                    className="w-full bg-transparent text-white placeholder-purple-300 outline-none resize-none font-light text-lg"
                    rows="3"
                    disabled={isProcessing}
                  />
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-purple-300">
                      {isProcessing ? 'AI is thinking...' : 'Press Enter to send'}
                    </span>
                    <button
                      onClick={handleNaturalLanguageInput}
                      disabled={isProcessing || !input.trim()}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      {isProcessing ? 'Processing...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Response */}
            {aiResponse && (
              <div className="mt-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30">
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-purple-300 flex-shrink-0 mt-1" />
                  <p className="text-white font-light leading-relaxed">{aiResponse}</p>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Natural Language Input */}
        {activeTab === 'dashboard' && (
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
            <div className="flex items-start gap-4">
              <MessageSquare className="w-6 h-6 mt-1 text-purple-300 flex-shrink-0" />
              <div className="flex-grow">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleNaturalLanguageInput();
                    }
                  }}
                  placeholder="Talk to your AI coach... Try: 'I want to run a marathon this year' or 'I ran 5k today!' or 'How am I doing?'"
                  className="w-full bg-transparent text-white placeholder-purple-300 outline-none resize-none font-light text-lg"
                  rows="3"
                  disabled={isProcessing}
                />
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-purple-300">
                    {isProcessing ? 'AI is thinking...' : 'Press Enter to send'}
                  </span>
                  <button
                    onClick={handleNaturalLanguageInput}
                    disabled={isProcessing || !input.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {isProcessing ? 'Processing...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Response */}
          {aiResponse && (
            <div className="mt-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30">
              <div className="flex gap-3">
                <Sparkles className="w-5 h-5 text-purple-300 flex-shrink-0 mt-1" />
                <p className="text-white font-light leading-relaxed">{aiResponse}</p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        )}

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
        <div>

        {/* Resolutions Grid */}
        {resolutions.length > 0 ? (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="title-font text-4xl font-bold">Your Resolutions</h2>
              <button
                onClick={resetAllData}
                className="text-sm text-purple-300 hover:text-purple-100 transition-colors"
              >
                Reset All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {resolutions.map((resolution, index) => (
                <div
                  key={resolution.id}
                  className="resolution-card bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-400/50 transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3 flex-grow">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{ backgroundColor: getCategoryColor(resolution.category) + '40', color: getCategoryColor(resolution.category) }}
                      >
                        {getCategoryIcon(resolution.category)}
                      </div>
                      <div className="flex-grow">
                        {editingId === resolution.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="flex-grow bg-white/10 px-3 py-1 rounded-lg outline-none text-white"
                              autoFocus
                            />
                            <button onClick={saveEdit} className="text-green-400 hover:text-green-300">
                              <Check className="w-5 h-5" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <h3 className="text-xl font-semibold text-white mb-1">{resolution.title}</h3>
                        )}
                        <p className="text-sm text-purple-300 capitalize">{resolution.category}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(resolution)}
                        className="text-purple-300 hover:text-purple-100 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(resolution.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-purple-200">{getProgressMessage(resolution.progress)}</span>
                      <span className="text-lg font-bold" style={{ color: getCategoryColor(resolution.category) }}>
                        {resolution.progress}%
                      </span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="progress-bar h-full rounded-full"
                        style={{
                          width: `${resolution.progress}%`,
                          background: `linear-gradient(90deg, ${getCategoryColor(resolution.category)}, ${getCategoryColor(resolution.category)}dd)`
                        }}
                      />
                    </div>
                  </div>

                  {/* Recent Updates */}
                  {resolution.updates.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-purple-300 mb-2">Latest Update:</p>
                      <p className="text-sm text-white/80">
                        {resolution.updates[resolution.updates.length - 1].text}
                      </p>
                      <p className="text-xs text-purple-300 mt-1">
                        {new Date(resolution.updates[resolution.updates.length - 1].date).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Milestones */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-purple-300 font-medium">Milestones</p>
                      <button
                        onClick={() => setShowMilestones(prev => ({
                          ...prev,
                          [resolution.id]: !prev[resolution.id]
                        }))}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    </div>

                    {(resolution.milestones || []).slice(0, showMilestones[resolution.id] ? undefined : 2).map(milestone => (
                      <div key={milestone.id} className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => toggleMilestone(resolution.id, milestone.id)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            milestone.completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-purple-400 hover:border-purple-300'
                          }`}
                        >
                          {milestone.completed && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <span className={`text-sm ${
                          milestone.completed ? 'text-green-300 line-through' : 'text-white/80'
                        }`}>
                          {milestone.text}
                        </span>
                      </div>
                    ))}

                    {(resolution.milestones || []).length > 2 && !showMilestones[resolution.id] && (
                      <button
                        onClick={() => setShowMilestones(prev => ({
                          ...prev,
                          [resolution.id]: true
                        }))}
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        +{resolution.milestones.length - 2} more
                      </button>
                    )}

                    <button
                      onClick={() => {
                        const milestone = prompt('Add a new milestone:');
                        if (milestone) addMilestone(resolution.id, milestone);
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 mt-2 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add milestone
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center py-16">
            <Target className="w-20 h-20 mx-auto mb-6 text-purple-400 opacity-50" />
            <h3 className="title-font text-3xl font-bold mb-4">Ready to Start Your Journey?</h3>
            <p className="text-lg text-purple-200 font-light mb-8">
              Tell your AI coach about a goal you want to achieve this year. Be specific or casual - the AI understands both!
            </p>
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 text-left">
              <p className="text-sm text-purple-300 mb-3">Try examples like:</p>
              <ul className="space-y-2 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  <span>"I want to read 24 books this year"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  <span>"Learn to play guitar"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  <span>"Save $5000 for a vacation"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  <span>"Run a 5K without stopping"</span>
                </li>
              </ul>
            </div>
          </div>
        )}
        </div>
        )}
      </div>
    </div>
  );
}
