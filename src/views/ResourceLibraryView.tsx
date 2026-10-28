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
  FileUp,
  Loader2,
  CheckCircle2,
  FileCheck,
  Eye,
  Hash,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { storage } from '../services/storage';
import { Resource, ResourceType } from '../types';
import { parseUploadedDocument } from '../services/documentExtractor';

export const ResourceLibraryView: React.FC = () => {
  const navigate = useNavigate();
  const { resources, subjects } = useStudyOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedResourceForPreview, setSelectedResourceForPreview] = useState<Resource | null>(null);

  // Drag and drop / Parsing State
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState('');

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

  const MAX_BATCH_FILES = 10;
  const MAX_FILE_SIZE_MB = 30;
  const MAX_TOTAL_SIZE_MB = 100;

  const handleFileUpload = async (fileInput: FileList | File[] | File) => {
    const rawFiles = fileInput instanceof File ? [fileInput] : Array.from(fileInput);
    if (rawFiles.length === 0) return;

    if (rawFiles.length > MAX_BATCH_FILES) {
      alert(`Upload limit: Maximum ${MAX_BATCH_FILES} files allowed per batch. You selected ${rawFiles.length}.`);
      return;
    }

    let totalBytes = 0;
    for (const f of rawFiles) {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`"${f.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
        return;
      }
      totalBytes += f.size;
    }

    if (totalBytes > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
      alert(`Total batch size exceeds the ${MAX_TOTAL_SIZE_MB}MB limit.`);
      return;
    }

    setIsParsing(true);
    let successCount = 0;

    try {
      for (let i = 0; i < rawFiles.length; i++) {
        const file = rawFiles[i];
        setParseStatus(`Parsing ${i + 1} of ${rawFiles.length}: "${file.name}"...`);

        try {
          const doc = await parseUploadedDocument(file);

          // Check duplicates by title or file hash
          const duplicate = resources.find(
            (r) => r.fileHash === doc.fileHash || r.title.toLowerCase() === doc.title.toLowerCase()
          );
          if (duplicate) {
            console.log(`Document "${doc.title}" is already in your library.`);
            continue;
          }

          const res: Resource = {
            id: `res-${Date.now()}-${i}`,
            title: doc.title,
            type: doc.type,
            extractedText: doc.extractedText,
            extractedSections: doc.sections,
            fileHash: doc.fileHash,
            fileSize: doc.fileSize,
            subjectId: newSubjectId || subjects[0]?.id,
            tags: [
              doc.type.toUpperCase(),
              doc.pageCount ? `${doc.pageCount} Pages` : `${doc.wordCount.toLocaleString()} Words`,
              'Direct Upload',
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          storage.saveResource(res);
          storage.addXP(35, `Imported document "${file.name}"`);
          successCount++;
        } catch (fileErr) {
          console.warn(`Failed to parse ${file.name}:`, fileErr);
        }
      }

      if (successCount > 0) {
        storage.createNotification({
          title: 'Resources Imported',
          message: `Successfully imported ${successCount} document${successCount > 1 ? 's' : ''} into your Resource Library. Ready for AI tutoring and grounding.`,
          category: 'system',
        });
        setShowAddModal(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown extraction error';
      alert(`Error reading files: ${msg}`);
    } finally {
      setIsParsing(false);
      setParseStatus('');
    }
  };

  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

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

      {/* Direct Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) {
            handleFileUpload(e.dataTransfer.files);
          }
        }}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
        }`}
      >
        {isParsing ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <span className="text-sm font-bold text-white">{parseStatus}</span>
            <span className="text-xs text-slate-400">Running client-side parsing without server transmission</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-400">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Drag and drop your study PDFs, DOCX, Markdown, or Code here
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Text, page counts, and headings are extracted in-browser and ready for instant AI tutoring.
              </p>
            </div>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white">
              <FileUp className="h-4 w-4" />
              <span>Browse Files from Device</span>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt,.md,.markdown,.json,.py,.js,.ts,.cpp,.c,.java"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleFileUpload(e.target.files);
                }}
              />
            </label>
            <span className="text-[10px] text-slate-500 mt-0.5">
              Batch limit: Up to 10 files • Max 30MB each • 100MB total
            </span>
          </div>
        )}
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
            No resources match your search criteria. Drag and drop textbook PDFs, lecture slides, or markdown notes above!
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

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedResourceForPreview(res)}
                      className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                      title="Preview content"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => storage.deleteResource(res.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                      title="Delete resource"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-1">{res.title}</h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                    {res.extractedText?.slice(0, 140)}...
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
                  onClick={() => {
                    sessionStorage.setItem('study_os_active_grounding_text', res.extractedText || '');
                    sessionStorage.setItem('study_os_active_grounding_title', res.title);
                    navigate('/learning');
                  }}
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
              <h3 className="text-sm font-bold text-white">Upload Document or Add Resource</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Direct Upload Button inside Modal */}
            <div className="mt-4 rounded-xl border border-dashed border-indigo-500/50 bg-indigo-500/5 p-4 text-center">
              <p className="text-xs font-semibold text-indigo-300">Fast Upload & Parse</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Select any PDF, Word doc, or markdown file from your disk</p>
              <label className="mt-2.5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-500">
                <FileUp className="h-3.5 w-3.5" />
                <span>Choose Files to Auto-Extract</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.md,.markdown,.json,.py,.js,.ts,.cpp,.c,.java"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) handleFileUpload(e.target.files);
                  }}
                />
              </label>
            </div>

            <div className="relative my-4 text-center">
              <span className="bg-slate-900 px-2 text-[10px] uppercase tracking-wider text-slate-500">
                Or manually create / paste excerpt
              </span>
              <div className="absolute inset-0 -z-10 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
            </div>

            <form onSubmit={handleCreateResource} className="space-y-4">
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
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 font-mono"
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

      {/* Document Preview Modal */}
      {selectedResourceForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedResourceForPreview.title}</h3>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span>Type: {selectedResourceForPreview.type.toUpperCase()}</span>
                  {selectedResourceForPreview.fileSize && (
                    <span>• {(selectedResourceForPreview.fileSize / 1024).toFixed(1)} KB</span>
                  )}
                  {selectedResourceForPreview.fileHash && (
                    <span>• ID: {selectedResourceForPreview.fileHash}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedResourceForPreview(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-400">Extracted Document Text</span>
                <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">
                  {selectedResourceForPreview.extractedText || 'No text extracted.'}
                </div>
              </div>

              {selectedResourceForPreview.extractedSections && selectedResourceForPreview.extractedSections.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-400">Extracted Structure & Sections</span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {selectedResourceForPreview.extractedSections.map((sec, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
                        <div className="font-semibold text-indigo-300">{sec.heading}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">{sec.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 p-4">
              <span className="text-xs text-slate-400">
                Added {new Date(selectedResourceForPreview.createdAt).toLocaleDateString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedResourceForPreview(null)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    sessionStorage.setItem('study_os_active_grounding_text', selectedResourceForPreview.extractedText || '');
                    sessionStorage.setItem('study_os_active_grounding_title', selectedResourceForPreview.title);
                    setSelectedResourceForPreview(null);
                    navigate('/learning');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Teach in Studio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
