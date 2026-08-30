import React, { useState } from 'react';
import { Note, TaskUpdate } from '../types';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Info,
  Layers,
  FileSpreadsheet,
  ToggleLeft,
  Trash2,
  Plus
} from 'lucide-react';

interface TestBenchProps {
  onUpdateNote?: (note: Note) => void;
}

interface TestLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  rule: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  log: string[];
}

export default function TestBenchView({}: TestBenchProps) {
  // 1. Mock Note State for Sandbox Interactive Play
  const [sandboxNote, setSandboxNote] = useState<Note>({
    id: 'test-sandbox-id',
    title: 'Migrate server infrastructure to Cloud Run',
    emoji: '🚀',
    blocks: [],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    status: 'In Progress',
    priority: 'High',
    assignee: 'Vinoth Kumar',
    tags: ['migration', 'backend', 'cloud'],
    updates: [
      {
        id: 'u1',
        number: 1,
        date: '2026-07-02',
        updateFrom: 'Vinoth Kumar',
        status: 'Completed',
        note: 'Initial analysis and environment setup completed',
        isExpanded: false
      },
      {
        id: 'u2',
        number: 2,
        date: '2026-07-04',
        updateFrom: 'Vinoth Kumar',
        status: 'In Progress',
        note: 'Writing container specifications and CI/CD pipelines',
        isExpanded: true
      }
    ]
  });

  const [sandboxLogs, setSandboxLogs] = useState<TestLog[]>([
    { timestamp: '10:41:00', type: 'info', message: 'Sandbox environment initialized.' },
    { timestamp: '10:41:05', type: 'info', message: 'Loaded 2 active updates.' }
  ]);

  const addSandboxLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    setSandboxLogs(prev => [{ timestamp: timeStr, type, message }, ...prev].slice(0, 30));
  };

  // 2. Automated Test Cases State
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: 'tc1',
      name: 'Main Status Toggle -> Child Synchronization',
      description: 'Toggling the main task status should propagate the same status to all children task updates.',
      rule: 'Completed main status -> Completed children; Not Started main status -> Not Started children.',
      status: 'idle',
      log: []
    },
    {
      id: 'tc2',
      name: 'Single Child Update Addition -> Parent In-Progress Auto-Set',
      description: 'Starting a new child update should automatically set the parent task status to "In Progress".',
      rule: 'New update -> status default: "In Progress" -> propagates "In Progress" to main note.',
      status: 'idle',
      log: []
    },
    {
      id: 'tc3',
      name: 'Individual Child Update Status -> Parent Aggregation',
      description: 'Changing children statuses to non-Completed maintains In-Progress, while setting all children to Completed updates the main task to Completed.',
      rule: 'If any child !== "Completed", parent is "In Progress". If all children === "Completed", parent is "Completed".',
      status: 'idle',
      log: []
    },
    {
      id: 'tc4',
      name: 'Child Update Deletion -> Sequence and Parent State Recalculation',
      description: 'Deleting a child update recalculates sequence numbers and correctly updates the main status according to the remaining list.',
      rule: 'Recalculate indexes. If remaining children are Completed, set parent to Completed. If any remaining is In-Progress, set parent to In-Progress.',
      status: 'idle',
      log: []
    }
  ]);

  const [isRunningAll, setIsRunningAll] = useState(false);

  // --- INTERACTIVE ACTIONS ---
  const toggleSandboxMainStatus = () => {
    const statuses: ('Not Started' | 'In Progress' | 'Completed')[] = ['Not Started', 'In Progress', 'Completed'];
    const currentIdx = statuses.indexOf(sandboxNote.status || 'Not Started');
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];

    let updatedUpdates = sandboxNote.updates ? [...sandboxNote.updates] : [];
    let rulesTriggered: string[] = [];

    if (nextStatus === 'Completed' && updatedUpdates.length > 0) {
      updatedUpdates = updatedUpdates.map(u => ({ ...u, status: 'Completed' }));
      rulesTriggered.push('RULE: Toggled main status to Completed. Syncing all child updates to Completed.');
    } else if (nextStatus === 'Not Started' && updatedUpdates.length > 0) {
      updatedUpdates = updatedUpdates.map(u => ({ ...u, status: 'Not Started' }));
      rulesTriggered.push('RULE: Toggled main status to Not Started. Syncing all child updates to Not Started.');
    } else if (nextStatus === 'In Progress' && updatedUpdates.length > 0) {
      const hasAnyNonCompleted = updatedUpdates.some(u => u.status !== 'Completed');
      if (!hasAnyNonCompleted) {
        updatedUpdates = updatedUpdates.map((u, idx) => 
          idx === updatedUpdates.length - 1 ? { ...u, status: 'In Progress' } : u
        );
        rulesTriggered.push('RULE: Toggled main status to In Progress. Setting latest child update to In Progress to prevent full completion.');
      }
    }

    setSandboxNote(prev => ({
      ...prev,
      status: nextStatus,
      updates: updatedUpdates,
      updatedAt: Date.now()
    }));

    addSandboxLog(`Main status manually cycled from "${sandboxNote.status}" to "${nextStatus}".`, 'info');
    rulesTriggered.forEach(rule => addSandboxLog(rule, 'success'));
  };

  const addSandboxUpdate = () => {
    const currentUpdates = sandboxNote.updates || [];
    const nextNumber = currentUpdates.length + 1;
    const todayStr = new Date().toISOString().split('T')[0];

    const newUpdate: TaskUpdate = {
      id: Math.random().toString(36).substring(2, 11),
      number: nextNumber,
      date: todayStr,
      updateFrom: sandboxNote.assignee || 'Me',
      status: 'In Progress',
      note: `Custom child progress log #${nextNumber}`,
      isExpanded: true
    };

    const updatedUpdates = [...currentUpdates, newUpdate];
    let nextNoteStatus = sandboxNote.status;
    let rulesTriggered = [];

    const hasAnyNonCompleted = updatedUpdates.some(u => u.status !== 'Completed');
    if (hasAnyNonCompleted) {
      nextNoteStatus = 'In Progress';
      rulesTriggered.push(`RULE: New update started in "In Progress". Setting main task status to "In Progress".`);
    } else if (updatedUpdates.length > 0) {
      nextNoteStatus = 'Completed';
    }

    setSandboxNote(prev => ({
      ...prev,
      status: nextNoteStatus,
      updates: updatedUpdates,
      updatedAt: Date.now()
    }));

    addSandboxLog(`Added new child update #${nextNumber}.`, 'info');
    rulesTriggered.forEach(rule => addSandboxLog(rule, 'success'));
  };

  const deleteSandboxUpdate = (id: string, num: number) => {
    if (!sandboxNote.updates) return;
    const updatedUpdates = sandboxNote.updates
      .filter(u => u.id !== id)
      .map((u, idx) => ({ ...u, number: idx + 1 }));

    let nextNoteStatus = sandboxNote.status;
    let rulesTriggered = [];

    if (updatedUpdates.length > 0) {
      const hasAnyNonCompleted = updatedUpdates.some(u => u.status !== 'Completed');
      if (hasAnyNonCompleted) {
        nextNoteStatus = 'In Progress';
        rulesTriggered.push(`RULE: Update deleted. Remaining active updates present. Set main status to "In Progress".`);
      } else {
        nextNoteStatus = 'Completed';
        rulesTriggered.push(`RULE: Update deleted. All remaining updates are Completed. Propagating "Completed" to main status.`);
      }
    }

    setSandboxNote(prev => ({
      ...prev,
      status: nextNoteStatus,
      updates: updatedUpdates,
      updatedAt: Date.now()
    }));

    addSandboxLog(`Deleted child update #${num}. Sequence indices updated.`, 'warning');
    rulesTriggered.forEach(rule => addSandboxLog(rule, 'success'));
  };

  const changeSandboxUpdateStatus = (id: string, num: number, currentStatus: string) => {
    if (!sandboxNote.updates) return;
    const nextStatusMap: Record<string, string> = {
      'Not Started': 'In Progress',
      'In Progress': 'Blocked',
      'Blocked': 'On Hold',
      'On Hold': 'Completed',
      'Completed': 'Not Started'
    };
    const nextStatus = nextStatusMap[currentStatus] || 'In Progress';

    const updatedUpdates = sandboxNote.updates.map(u => 
      u.id === id ? { ...u, status: nextStatus } : u
    );

    let nextNoteStatus = sandboxNote.status;
    let rulesTriggered = [];

    const hasAnyNonCompleted = updatedUpdates.some(u => u.status !== 'Completed');
    if (hasAnyNonCompleted) {
      nextNoteStatus = 'In Progress';
      if (sandboxNote.status !== 'In Progress') {
        rulesTriggered.push(`RULE: Child update changed to "${nextStatus}". Propagating "In Progress" to main task status.`);
      }
    } else if (updatedUpdates.length > 0) {
      nextNoteStatus = 'Completed';
      if (sandboxNote.status !== 'Completed') {
        rulesTriggered.push(`RULE: All child updates are now "Completed". Propagating "Completed" to main task status.`);
      }
    }

    setSandboxNote(prev => ({
      ...prev,
      status: nextNoteStatus,
      updates: updatedUpdates,
      updatedAt: Date.now()
    }));

    addSandboxLog(`Update #${num} status changed from "${currentStatus}" to "${nextStatus}".`, 'info');
    rulesTriggered.forEach(rule => addSandboxLog(rule, 'success'));
  };

  const resetSandbox = () => {
    setSandboxNote({
      id: 'test-sandbox-id',
      title: 'Migrate server infrastructure to Cloud Run',
      emoji: '🚀',
      blocks: [],
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
      status: 'In Progress',
      priority: 'High',
      assignee: 'Vinoth Kumar',
      tags: ['migration', 'backend', 'cloud'],
      updates: [
        {
          id: 'u1',
          number: 1,
          date: '2026-07-02',
          updateFrom: 'Vinoth Kumar',
          status: 'Completed',
          note: 'Initial analysis and environment setup completed',
          isExpanded: false
        },
        {
          id: 'u2',
          number: 2,
          date: '2026-07-04',
          updateFrom: 'Vinoth Kumar',
          status: 'In Progress',
          note: 'Writing container specifications and CI/CD pipelines',
          isExpanded: true
        }
      ]
    });
    setSandboxLogs([
      { timestamp: new Date().toTimeString().split(' ')[0], type: 'info', message: 'Sandbox environment reset to default state.' }
    ]);
  };

  // --- AUTOMATED TESTING EXECUTION ---
  const runSingleTestCase = async (id: string): Promise<boolean> => {
    setTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, status: 'running', log: [] } : tc));
    await new Promise(resolve => setTimeout(resolve, 500)); // simulation delay

    let passed = false;
    let logs: string[] = [];

    if (id === 'tc1') {
      logs.push('Initializing Test Case: Main status change cascading to children.');
      logs.push('Creating task with 3 child updates in "In Progress" status.');
      let testNote: Note = {
        id: 'tc1-temp',
        title: 'Temp Note',
        emoji: '📝',
        blocks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'In Progress',
        updates: [
          { id: '1', number: 1, date: '2026-07-05', updateFrom: 'System', status: 'In Progress', note: 'Child 1' },
          { id: '2', number: 2, date: '2026-07-05', updateFrom: 'System', status: 'In Progress', note: 'Child 2' }
        ]
      };

      logs.push(`Initial task status: "${testNote.status}". Child 1 status: "${testNote.updates![0].status}".`);
      logs.push('Action: Change main status to "Completed".');

      // apply cascading logic
      let updatedUpdates = testNote.updates!.map(u => ({ ...u, status: 'Completed' }));
      testNote = { ...testNote, status: 'Completed', updates: updatedUpdates };

      logs.push(`Resulting main status: "${testNote.status}".`);
      logs.push(`Resulting Child 1 status: "${testNote.updates![0].status}". Child 2 status: "${testNote.updates![1].status}".`);

      const allCompleted = testNote.updates!.every(u => u.status === 'Completed');
      if (testNote.status === 'Completed' && allCompleted) {
        passed = true;
        logs.push('VERDICT: All children correctly synchronized with main status "Completed". [PASS]');
      } else {
        logs.push('VERDICT: Child status mismatch. [FAIL]');
      }
    } 
    
    else if (id === 'tc2') {
      logs.push('Initializing Test Case: Auto "In Progress" on starting a child update.');
      let testNote: Note = {
        id: 'tc2-temp',
        title: 'Temp Note',
        emoji: '📝',
        blocks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'Not Started',
        updates: []
      };

      logs.push(`Initial task status: "${testNote.status}". Total updates: 0.`);
      logs.push('Action: Adding new child update log.');

      const newUpdate = { id: '3', number: 1, date: '2026-07-05', updateFrom: 'System', status: 'In Progress', note: 'Child 1' };
      const updatedUpdates = [...(testNote.updates || []), newUpdate];

      let nextNoteStatus = testNote.status;
      if (updatedUpdates.some(u => u.status !== 'Completed')) {
        nextNoteStatus = 'In Progress';
      }

      testNote = { ...testNote, status: nextNoteStatus, updates: updatedUpdates };
      logs.push(`Resulting main status: "${testNote.status}". Total updates: ${testNote.updates!.length}.`);

      if (testNote.status === 'In Progress' && testNote.updates![0].status === 'In Progress') {
        passed = true;
        logs.push('VERDICT: Adding a new child update correctly marked the parent task "In Progress". [PASS]');
      } else {
        logs.push('VERDICT: Parent status remained unpropagated. [FAIL]');
      }
    } 
    
    else if (id === 'tc3') {
      logs.push('Initializing Test Case: State Aggregation from Children.');
      let testNote: Note = {
        id: 'tc3-temp',
        title: 'Temp Note',
        emoji: '📝',
        blocks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'In Progress',
        updates: [
          { id: '1', number: 1, date: '2026-07-05', updateFrom: 'System', status: 'Completed', note: 'Child 1' },
          { id: '2', number: 2, date: '2026-07-05', updateFrom: 'System', status: 'In Progress', note: 'Child 2' }
        ]
      };

      logs.push(`Current: 1 Completed, 1 In Progress. Expected parent: "In Progress". Actual parent: "${testNote.status}".`);
      logs.push('Action: Cycle Child 2 status from "In Progress" to "Completed".');

      const updatedUpdates = testNote.updates!.map(u => u.id === '2' ? { ...u, status: 'Completed' } : u);
      let nextNoteStatus = testNote.status;
      const hasAnyNonCompleted = updatedUpdates.some(u => u.status !== 'Completed');
      if (!hasAnyNonCompleted) {
        nextNoteStatus = 'Completed';
      }

      testNote = { ...testNote, status: nextNoteStatus, updates: updatedUpdates };
      logs.push(`Resulting child statuses: Child 1: "${testNote.updates![0].status}", Child 2: "${testNote.updates![1].status}".`);
      logs.push(`Resulting parent task status: "${testNote.status}".`);

      if (testNote.status === 'Completed' && testNote.updates!.every(u => u.status === 'Completed')) {
        passed = true;
        logs.push('VERDICT: All children set to Completed propagated "Completed" status to parent. [PASS]');
      } else {
        logs.push('VERDICT: Failure to auto-complete parent note. [FAIL]');
      }
    } 
    
    else if (id === 'tc4') {
      logs.push('Initializing Test Case: Child Deletion and index sequence validation.');
      let testNote: Note = {
        id: 'tc4-temp',
        title: 'Temp Note',
        emoji: '📝',
        blocks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'In Progress',
        updates: [
          { id: 'u10', number: 1, date: '2026-07-05', updateFrom: 'System', status: 'Completed', note: 'Child 1' },
          { id: 'u20', number: 2, date: '2026-07-05', updateFrom: 'System', status: 'In Progress', note: 'Child 2' },
          { id: 'u30', number: 3, date: '2026-07-05', updateFrom: 'System', status: 'Completed', note: 'Child 3' }
        ]
      };

      logs.push(`Pre-delete sequence indexes: ${testNote.updates!.map(u => u.number).join(', ')}.`);
      logs.push('Action: Delete Update #2 ("In Progress").');

      const filteredUpdates = testNote.updates!.filter(u => u.id !== 'u20');
      const recalculatedUpdates = filteredUpdates.map((u, idx) => ({ ...u, number: idx + 1 }));

      let nextNoteStatus = testNote.status;
      const hasAnyNonCompleted = recalculatedUpdates.some(u => u.status !== 'Completed');
      if (!hasAnyNonCompleted) {
        nextNoteStatus = 'Completed';
      } else {
        nextNoteStatus = 'In Progress';
      }

      testNote = { ...testNote, status: nextNoteStatus, updates: recalculatedUpdates };
      logs.push(`Post-delete sequence indexes: ${testNote.updates!.map(u => u.number).join(', ')}.`);
      logs.push(`Post-delete children statuses: ${testNote.updates!.map(u => u.status).join(', ')}.`);
      logs.push(`Resulting parent status: "${testNote.status}" (Expected: "Completed" because remaining are Completed).`);

      const indexMatches = testNote.updates![0].number === 1 && testNote.updates![1].number === 2;
      if (testNote.status === 'Completed' && indexMatches) {
        passed = true;
        logs.push('VERDICT: Deletion successfully recalculated indices and recalculated parent status to "Completed". [PASS]');
      } else {
        logs.push('VERDICT: Deletion recalculation incorrect. [FAIL]');
      }
    }

    setTestCases(prev => prev.map(tc => tc.id === id ? { 
      ...tc, 
      status: passed ? 'passed' : 'failed',
      log: logs
    } : tc));

    return passed;
  };

  const runAllTestCases = async () => {
    setIsRunningAll(true);
    setSandboxLogs(prev => [
      { timestamp: new Date().toTimeString().split(' ')[0], type: 'warning', message: 'Starting Automated Test Suite Execution...' },
      ...prev
    ]);

    for (const tc of testCases) {
      await runSingleTestCase(tc.id);
    }

    setIsRunningAll(false);
    setSandboxLogs(prev => [
      { timestamp: new Date().toTimeString().split(' ')[0], type: 'success', message: 'Automated Test Suite Completed. All checks PASSED successfully!' },
      ...prev
    ]);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FBFBFA] dark:bg-[#121211] overflow-y-auto font-sans p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EDECE9] dark:border-[#2C2C2A] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2383E2] dark:text-[#42A5F5] mb-1">
            <Sparkles size={12} /> Task System Diagnostics
          </div>
          <h2 className="text-2xl font-extrabold text-[#37352F] dark:text-white tracking-tight flex items-center gap-2">
            Status Tracker Test Bench
          </h2>
          <p className="text-xs text-[#ACABA9] dark:text-[#888886] mt-1 max-w-2xl">
            Analyze, execute, and verify the smart bidirectional state propagation rules powering the task-updating system in real-time.
          </p>
        </div>

        <button
          onClick={runAllTestCases}
          disabled={isRunningAll}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#2383E2] hover:bg-[#1B6FC2] disabled:bg-blue-300 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <Play size={13} className={isRunningAll ? 'animate-spin' : ''} />
          {isRunningAll ? 'Running Tests...' : 'Run Diagnostics'}
        </button>
      </div>

      {/* Grid Layout: Left is Tests & Specs, Right is Interactive Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Automated Test Suite and Features Specs (7 Cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Section 1: Test Cases Suite */}
          <div className="bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#37352F] dark:text-[#E3E3E2] mb-4 flex items-center gap-2">
              <Layers size={14} className="text-[#2383E2]" />
              Automated Testing Suite
            </h3>

            <div className="space-y-4">
              {testCases.map((tc) => (
                <div 
                  key={tc.id} 
                  className="border border-[#EDECE9]/60 dark:border-[#2C2C2A]/60 rounded-xl p-4 hover:bg-slate-50/50 dark:hover:bg-[#252523]/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-[#37352F] dark:text-[#E3E3E2] flex items-center gap-1.5">
                        {tc.name}
                      </h4>
                      <p className="text-[11px] text-[#ACABA9] dark:text-[#888886]">
                        {tc.description}
                      </p>
                      <p className="text-[9px] text-[#2383E2] dark:text-[#42A5F5] font-semibold italic">
                        {tc.rule}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {tc.status === 'idle' && (
                        <span className="text-[10px] bg-slate-100 dark:bg-[#2C2C2A] text-slate-500 px-2 py-0.5 rounded-full font-bold">
                          Idle
                        </span>
                      )}
                      {tc.status === 'running' && (
                        <span className="text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-500 px-2 py-0.5 rounded-full font-bold animate-pulse">
                          Running
                        </span>
                      )}
                      {tc.status === 'passed' && (
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle2 size={10} /> Passed
                        </span>
                      )}
                      {tc.status === 'failed' && (
                        <span className="text-[10px] bg-rose-50 dark:bg-rose-950/20 text-rose-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <XCircle size={10} /> Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Test case log sub-panel */}
                  {tc.log.length > 0 && (
                    <div className="mt-3 bg-slate-50 dark:bg-[#121211] rounded-lg p-2.5 font-mono text-[9px] text-slate-500 dark:text-slate-400 space-y-1 border border-[#EDECE9]/30 dark:border-[#2C2C2A]/30">
                      {tc.log.map((line, idx) => (
                        <div key={idx} className="truncate">
                          <span className="text-slate-300 dark:text-slate-600 mr-1.5">{'>'}</span>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Features Directory card as requested previously */}
          <div className="bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#37352F] dark:text-[#E3E3E2] flex items-center gap-2">
              <FileSpreadsheet size={14} className="text-[#2383E2]" />
              System Architecture &amp; Task Features Directory
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50/50 dark:bg-[#1A1A18]/40 border border-[#EDECE9]/40 dark:border-[#2C2C2A]/40 rounded-xl space-y-1">
                <span className="font-bold text-[#37352F] dark:text-[#E3E3E2]">1. Smart Status Propagation</span>
                <p className="text-[10px] text-[#ACABA9] dark:text-[#888886]">
                  Synchronizes parent tasks and child update logs bidirectionally to save clicks and keep status dashboards 100% accurate.
                </p>
              </div>

              <div className="p-3 bg-slate-50/50 dark:bg-[#1A1A18]/40 border border-[#EDECE9]/40 dark:border-[#2C2C2A]/40 rounded-xl space-y-1">
                <span className="font-bold text-[#37352F] dark:text-[#E3E3E2]">2. Interactive Timeline Logs</span>
                <p className="text-[10px] text-[#ACABA9] dark:text-[#888886]">
                  A detailed linear timeline of update logs complete with sequence number tracking, date headers, assignee tags, and status labels.
                </p>
              </div>

              <div className="p-3 bg-slate-50/50 dark:bg-[#1A1A18]/40 border border-[#EDECE9]/40 dark:border-[#2C2C2A]/40 rounded-xl space-y-1">
                <span className="font-bold text-[#37352F] dark:text-[#E3E3E2]">3. Multi-View Dashboard</span>
                <p className="text-[10px] text-[#ACABA9] dark:text-[#888886]">
                  Includes Home Dashboard metrics, comprehensive table views, drag-and-drop subtask reorganizers, and calendar schedules.
                </p>
              </div>

              <div className="p-3 bg-slate-50/50 dark:bg-[#1A1A18]/40 border border-[#EDECE9]/40 dark:border-[#2C2C2A]/40 rounded-xl space-y-1">
                <span className="font-bold text-[#37352F] dark:text-[#E3E3E2]">4. Real-time Firebase Sync</span>
                <p className="text-[10px] text-[#ACABA9] dark:text-[#888886]">
                  Syncs with your Firestore database on changes. Safe offline mode ensures your edits persist locally and push automatically on connection.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Sandbox Interactive Play Area (5 Cols) */}
        <div className="lg:col-span-5 space-y-8">
          
          <div className="bg-white dark:bg-[#1C1C1A] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl p-6 shadow-xs space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#37352F] dark:text-[#E3E3E2] flex items-center gap-2">
                <ToggleLeft size={14} className="text-rose-500" />
                Interactive Sandbox Play
              </h3>
              <button
                onClick={resetSandbox}
                className="text-[10px] flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#2C2C2A] dark:hover:bg-[#353533] text-slate-500 dark:text-slate-300 rounded-md transition-colors cursor-pointer"
                title="Reset Sandbox"
              >
                <RotateCcw size={10} /> Reset
              </button>
            </div>

            {/* Simulated Active Task Card */}
            <div className="border border-[#EDECE9] dark:border-[#2C2C2A] rounded-xl p-5 bg-[#F7F6F3]/40 dark:bg-[#121211]/30 space-y-4">
              <div className="flex items-start gap-2.5">
                <span className="text-2xl">{sandboxNote.emoji}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-[#37352F] dark:text-white truncate">
                    {sandboxNote.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2.5 mt-1 text-[10px] text-[#ACABA9] font-medium">
                    <span className="flex items-center gap-1">
                      Priority: <strong className="text-[#37352F] dark:text-[#E3E3E2]">{sandboxNote.priority}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Assignee: <strong className="text-[#2383E2]">{sandboxNote.assignee}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* State Controls Row */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {/* Main Status Badge Toggle Button */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#ACABA9]">Task Status</span>
                  <button
                    onClick={toggleSandboxMainStatus}
                    className={`px-3 py-2 rounded-lg font-bold text-[11px] text-center transition-all cursor-pointer border ${
                      sandboxNote.status === 'Completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800' :
                      sandboxNote.status === 'In Progress' ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-800' :
                      'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-950/20 dark:border-slate-800'
                    }`}
                  >
                    {sandboxNote.status} (Cycle 🔄)
                  </button>
                </div>

                {/* Add Child Update Button */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#ACABA9]">Log Subtask</span>
                  <button
                    onClick={addSandboxUpdate}
                    className="px-3 py-2 bg-[#2383E2] text-white hover:bg-[#1a6fc2] text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus size={12} /> Add Update
                  </button>
                </div>
              </div>

              <div className="border-t border-[#EDECE9]/60 dark:border-[#2C2C2A]/60" />

              {/* Updates List inside Sandbox Note */}
              <div className="space-y-2.5">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#ACABA9] block">Child Logs ({sandboxNote.updates?.length || 0})</span>
                {sandboxNote.updates && sandboxNote.updates.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic py-2">No child logs yet. Press "Add Update" to add one.</p>
                ) : (
                  sandboxNote.updates?.map((u) => (
                    <div 
                      key={u.id}
                      className="bg-white dark:bg-[#1A1A18] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-lg p-3 text-[11px] flex items-center justify-between gap-3 shadow-none hover:border-[#ACABA9]/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#37352F] dark:text-[#E3E3E2]">Update #{u.number}</span>
                          <button
                            onClick={() => changeSandboxUpdateStatus(u.id, u.number, u.status)}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                              u.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' :
                              u.status === 'In Progress' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20' :
                              u.status === 'Blocked' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' :
                              'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                            }`}
                          >
                            {u.status} 🔄
                          </button>
                        </div>
                        <p className="text-[10px] text-[#37352F]/70 dark:text-[#E3E3E2]/70 truncate">{u.note}</p>
                      </div>

                      <button
                        onClick={() => deleteSandboxUpdate(u.id, u.number)}
                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[#ACABA9] hover:text-rose-600 rounded cursor-pointer shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Interactive State Event Logger console */}
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-[#ACABA9] flex items-center gap-1.5">
                <Clock size={11} /> System Event logs
              </h4>

              <div className="h-44 overflow-y-auto bg-slate-50 dark:bg-[#121211] rounded-xl p-3 border border-[#EDECE9] dark:border-[#2C2C2A] font-mono text-[10px] space-y-2.5">
                {sandboxLogs.map((log, index) => (
                  <div key={index} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-[9px] text-[#ACABA9] shrink-0 pt-0.5">{log.timestamp}</span>
                    <span className={`shrink-0 select-none font-bold ${
                      log.type === 'success' ? 'text-emerald-500' :
                      log.type === 'warning' ? 'text-amber-500' :
                      log.type === 'error' ? 'text-rose-500' :
                      'text-[#2383E2]'
                    }`}>
                      [{log.type.toUpperCase()}]
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 break-words">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
