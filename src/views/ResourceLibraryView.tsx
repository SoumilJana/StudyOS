import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderArchive,
  Search,
  Upload,
  FileText,
  FileCode,
  Globe,
  Tag,
  Sparkles,
  ExternalLink,
  Trash2,
  BookOpen,
  Plus,
  X,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { storage } from '../services/storage';
import { Resource, ResourceType } from '../types';

export const ResourceLibraryView: React.FC = () => {
  const navigate = useNavigate();
  const { resources, subjects } = useStudyOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New Resource Form
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ResourceType>('pdf');
  const [newUrl, setNewUrl] = useState('');
  const [newExtractedText, setNewExtractedText] = useState('');
  const [newSubjectId, setNewSubjectId] = useState<string>(subjects[0]?.id || '');
  const [newTags, setNewTags] = useState('Core, Syllabus');

  const filteredResources = resources.filter((res) => {
    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.extractedText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || res.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    // Pseudo-hash generation for deduplication check
    const pseudoHash = `hash-${newTitle.length}-${Date.now().toString(36)}`;
    const duplicate = resources.find((r) => r.title.toLowerCase() === newTitle.toLowerCase());
    if (duplicate) {
      alert('A resource with this exact title already exists in your library!');
      return;
    }

    const res: Resource = {
      id: `res-${Date.now()}`,
      title: newTitle,
      type: newType,
      url: newUrl || undefined,
      extractedText: newExtractedText || 'Standard extracted content from document.',
      fileHash: pseudoHash,
      subjectId: newSubjectId || undefined,
      tags: newTags.split(',').map((t) => t.trim()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.saveResource(res);
    storage.addXP(25, 'Added document to Resource Library');
    setShowAddModal(false);
    setNewTitle('');
    setNewExtractedText('');
    setNewUrl('');
  };

  const getIconForType = (type: ResourceType) => {
    switch (type) {
      case 'code':
        return <FileCode className="h-5 w-5 text-cyan-400" />;
      case 'url':
        return <Globe className="h-5 w-5 text-emerald-400" />;
      case 'markdown':
        return <FileText className="h-5 w-5 text-violet-400" />;
      default:
        return <FileText className="h-5 w-5 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Resource Library
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Central repository for textbooks, papers, lecture notes, code snippets, and source groundings.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          <span>Upload or Add Resource</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, extracted text, or tags..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
          >
            <option value="all">All Formats</option>
            <option value="pdf">PDF Documents</option>
            <option value="docx">Word DOCX</option>
            <option value="markdown">Markdown Notes</option>
            <option value="code">Source Code</option>
            <option value="url">Web Links</option>
          </select>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredResources.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center text-xs text-slate-500">
            No resources match your search criteria. Add textbook PDFs, lecture slides, or markdown notes!
          </div>
        ) : (
          filteredResources.map((res) => (
            <div
              key={res.id}
              className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-all hover:border-slate-700 hover:bg-slate-900"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-slate-800/80 p-2">
                      {getIconForType(res.type)}
                    </div>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono uppercase text-slate-400">
                      {res.type}
                    </span>
                  </div>

                  <button
                    onClick={() => storage.deleteResource(res.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                    title="Delete resource"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-1">{res.title}</h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                    {res.extractedText?.slice(0, 120)}...
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {res.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-slate-800/60 px-1.5 py-0.5 text-[9px] font-mono text-slate-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                <button
                  onClick={() => navigate('/learning')}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Teach in Studio</span>
                </button>
                <span className="text-[10px] text-slate-500">
                  {new Date(res.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Add Document or Resource</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Resource Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Raft Consensus Paper (Ongaro & Ousterhout)"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Type / Format</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ResourceType)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="docx">Word DOCX</option>
                    <option value="markdown">Markdown Notes</option>
                    <option value="code">Source Code</option>
                    <option value="url">External Link</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Linked Subject</label>
                  <select
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code}: {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Extracted Content / Notes Excerpt</label>
                <textarea
                  rows={4}
                  value={newExtractedText}
                  onChange={(e) => setNewExtractedText(e.target.value)}
                  placeholder="Paste text excerpt or key definitions for AI retrieval grounding..."
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Save to Library
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
