import os

path = r'd:\Sistema oficial de Gestion ACS\components\resources\MediaManagement.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# I will replace the entire content of DESKTOP_LAYOUT with a clean, unparenthesized version.
# We will identify the start (1063 approx) and end (1120 approx).

start_marker = "{loading ? ("
# Wait, let's find the actual block.
# I'll just look for the first '{loading ? (' after 'const DESKTOP_LAYOUT = ('

pos_start = text.find('const DESKTOP_LAYOUT = (')
bracket_start = text.find('{loading ? (', pos_start)

# Now find the end of this block.
# We know it ends before 'return ('
return_pos = text.find('return (', bracket_start)
# Backtrack to find the last ';' or ')' that ends DESKTOP_LAYOUT
end_layout = text.rfind(');', bracket_start, return_pos)

if bracket_start == -1 or end_layout == -1:
    print("Could not find block boundaries")
    exit(1)

# Now define a CLEAN block without parentheses for the branches.
# We will use the full card content from my memory (the one with Share2, etc.)

clean_desktop_content = """      {loading ?
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-exec-blue"></div>
        </div>
      : items.length === 0 ?
        <div className="text-center py-20 bg-[#0A0A0A] border border-dashed border-exec-border rounded-sm">
          <ImageIcon className="mx-auto text-gray-700 mb-4" size={48} />
          <p className="text-gray-500 font-medium">No hay contenidos planificados aún.</p>
        </div>
      : viewMode === 'grid' ?
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.filter(i => (i.category || 'facebook').includes(activeCategory)).map(item => (
            <div key={item.id} className="bg-exec-card-bg border border-exec-border group flex flex-col h-full relative transition-all duration-500 hover:border-exec-blue/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <div className="w-full bg-[#050505] border-b border-exec-border relative overflow-hidden flex items-center justify-center group-hover:bg-black transition-colors min-h-[220px] max-h-[320px]">
                {item.task?.completion_files && item.task.completion_files.length > 0 ? (
                  <SafeImage src={item.task.completion_files[0]} alt={item.title} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-all duration-700 h-auto w-auto" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-exec-slate/10 group-hover:text-exec-blue/20 transition-colors py-10">
                    {item.content_type === 'video' ? <Video size={40} strokeWidth={1} /> : <ImageIcon size={40} strokeWidth={1} />}
                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">Protocolo Pendiente</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 z-10 flex gap-1.5 p-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-sm">
                  {(item.category || 'facebook').includes('facebook') && <Facebook size={11} className="text-[#1877F2]" />}
                  {(item.category || 'facebook').includes('instagram') && <Instagram size={11} className="text-[#E4405F]" />}
                </div>
                <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
                  <span className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.2em] border border-white/5 backdrop-blur-xl shadow-2xl ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1 z-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {item.status === 'Listo' && (
                       <button onClick={() => { setEditedCopy(item.social_copy || ''); setActiveItemForPublish(item); setShowPublishModal(true); }} className="p-2 bg-exec-blue/10 text-exec-blue hover:bg-exec-blue hover:text-white rounded-sm transition-all border border-exec-blue/20">
                         <Share2 size={13} />
                       </button>
                    )}
                  </div>
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }} className="p-1.5 text-exec-slate/40 hover:text-white transition-colors">
                      <MoreVertical size={15} />
                    </button>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-exec-blue transition-colors mb-1 tracking-wide uppercase">{item.title}</h3>
                <p className="text-[10px] text-gray-500 line-clamp-3 min-h-[45px] leading-relaxed font-medium">{item.description || "Sin metadatos descriptivos."}</p>
                <div className="mt-auto pt-4 border-t border-exec-border/50 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2 text-exec-slate/30">
                    <CalendarIcon size={12} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{new Date(item.target_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      :
        <div className="exec-card p-0 overflow-hidden bg-[#0A0A0A] border-exec-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-exec-border bg-[#050505]">
                <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Título</th>
                <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Estado</th>
                <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Entrega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-exec-border/30">
              {items.filter(i => (i.category || 'facebook').includes(activeCategory)).map(item => (
                <tr key={item.id} className="group hover:bg-exec-blue/[0.02] transition-colors">
                  <td className="p-4 text-xs font-bold text-white uppercase">{item.title}</td>
                  <td className="p-4"><span className={`px-2 py-0.5 text-[8px] font-black border ${getStatusColor(item.status)}`}>{item.status}</span></td>
                  <td className="p-4 text-[10px] text-exec-slate/30 uppercase">{new Date(item.target_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  );"""

head = text[:bracket_start]
tail = text[end_layout + 2:] # everything after );

with open(path, 'w', encoding='utf-8') as f:
    f.write(head + clean_desktop_content + tail)

print("Successfully applied clean layout")
