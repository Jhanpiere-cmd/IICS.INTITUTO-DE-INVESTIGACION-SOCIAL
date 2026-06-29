import os

path = r'd:\Sistema oficial de Gestion ACS\components\resources\MediaManagement.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

grid_block = """        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  {(item.category || 'facebook').includes('youtube') && <Video size={11} className="text-red-500" />}
                  {(item.category || 'facebook').includes('shorts') && <Sparkles size={11} className="text-amber-400" />}
                </div>
                
                <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
                  <span className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.2em] border border-white/5 backdrop-blur-xl shadow-2xl ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  {item.task?.completion_files && item.task.completion_files.length > 0 ? (
                    <span className="px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.2em] bg-emerald-500/90 text-white border border-emerald-500/50 backdrop-blur-xl">Entregado</span>
                  ) : item.task?.file_urls && item.task.file_urls.length > 0 ? (
                    <span className="px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.2em] bg-exec-slate/80 text-black border border-exec-border backdrop-blur-xl opacity-80">Recursos</span>
                  ) : null}
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1 z-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {item.status === 'Listo' && (
                       <button onClick={() => { setEditedCopy(item.social_copy || ''); setActiveItemForPublish(item); setShowPublishModal(true); }} title="Publicar en Redes Sociales" className="p-2 bg-exec-blue/10 hover:bg-exec-blue text-exec-blue hover:text-white rounded-sm transition-all border border-exec-blue/20 shadow-glow">
                         <Share2 size={13} />
                       </button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }} className="p-1.5 text-exec-slate/40 hover:text-white transition-colors rounded-sm hover:bg-white/5">
                      <MoreVertical size={15} />
                    </button>
                    {activeMenuId === item.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-[#0A0A0A] border border-exec-border rounded-sm shadow-[0_30px_60px_rgba(0,0,0,1)] z-[300] animate-in fade-in zoom-in duration-200">
                        <div className="p-1">
                          <button onClick={() => openEditModal(item)} className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest">
                            <Sparkles size={13} className="text-exec-blue" /> Editar Protocolo
                          </button>
                          <button onClick={() => handleDelete(item)} className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all uppercase tracking-widest">
                            <X size={13} /> Eliminar Registro
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-exec-blue transition-colors mb-1 tracking-wide uppercase">{item.title}</h3>
                <p className="text-[10px] text-gray-500 line-clamp-3 min-h-[45px] leading-relaxed font-medium">{item.description || "Sin metadatos descriptivos."}</p>

                {item.social_copy && (
                  <div className="bg-exec-black/60 border border-exec-border px-3 py-2 rounded-sm mb-3 z-10 relative group/copy">
                    <div className="absolute top-0 left-0 w-1 h-full bg-exec-blue shadow-glow opacity-30"></div>
                    <p className="text-[10px] text-exec-slate/80 font-mono italic leading-relaxed line-clamp-3">{item.social_copy}</p>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-exec-border/50 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2 text-exec-slate/30">
                    <CalendarIcon size={12} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{new Date(item.target_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.assigned_user && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-exec-black border border-exec-border group-hover:border-exec-blue/40 transition-all rounded-full shadow-inner overflow-hidden">
                        {item.assigned_user.avatar_url ? (
                          <img src={item.assigned_user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover transition-all border border-white/10" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-exec-blue/10 flex items-center justify-center border border-exec-blue/20">
                            <span className="text-[10px] font-black text-exec-blue uppercase">{item.assigned_user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-200 font-bold uppercase tracking-tight truncate max-w-[80px] leading-tight">{item.assigned_user.full_name}</span>
                          <span className="text-[7px] text-gray-500 font-bold uppercase tracking-widest leading-tight">Responsable</span>
                        </div>
                      </div>
                    )}
                    {item.task && (
                      <div className={`px-2 py-0.5 border text-[7px] font-black uppercase tracking-widest ${item.task.status === 'Completada' ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5' : 'border-exec-blue/40 text-exec-blue bg-exec-blue/5'}`}>
                        {item.task.status === 'Completada' ? 'Asset Ready' : 'In Production'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="exec-card p-0 overflow-hidden bg-[#0A0A0A] border-exec-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-exec-border bg-[#050505]">
                <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Planificación / Título</th>
                <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Campaña / Evento</th>
                <th className="p-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Estado Operativo</th>
                <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Entrega</th>
                <th className="p-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Protocolo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-exec-border/30">
              {items.filter(i => (i.category || 'facebook').includes(activeCategory)).map(item => (
                <tr key={item.id} className="group hover:bg-exec-blue/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#0A0A0A] border border-exec-border flex items-center justify-center rounded-sm overflow-hidden group-hover:border-exec-blue/30 transition-all">
                        {(item.task?.completion_files && item.task.completion_files.length > 0) || (item.task?.file_urls?.[0]) ? (
                          <SafeImage src={(item.task?.completion_files && item.task.completion_files.length > 0) ? item.task.completion_files[0] : item.task!.file_urls[0]} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0" />
                        ) : (
                          item.content_type === 'video' ? <Video size={16} className="text-exec-blue/40" /> : <ImageIcon size={16} className="text-exec-blue/40" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white group-hover:text-exec-blue transition-colors text-xs tracking-wide uppercase">{item.title}</span>
                         <div className="flex items-center gap-1">
                           { (item.category || 'facebook').includes('facebook') && <Facebook size={8} className="text-gray-600" /> }
                           { (item.category || 'facebook').includes('instagram') && <Instagram size={8} className="text-gray-600" /> }
                           { (item.category || 'facebook').includes('youtube') && <Video size={8} className="text-gray-600" /> }
                           { (item.category || 'facebook').includes('shorts') && <Sparkles size={8} className="text-gray-600" /> }
                           <span className="text-[9px] text-gray-600 font-bold tracking-widest uppercase">{item.content_type}</span>
                         </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-exec-slate/40 font-bold text-[10px] tracking-widest uppercase">{item.events?.title || 'GENERAL / GLOBAL'}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 border text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-exec-slate/30 text-[10px] font-bold tracking-widest uppercase">
                      <Clock size={12} className="text-exec-blue/40" />
                      <span>{new Date(item.target_date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                        {item.status === 'Listo' && (
                           <button onClick={() => { setActiveItemForPublish(item); setShowPublishModal(true); }} title="Publicar en Redes Sociales" className="p-2 text-exec-blue hover:bg-exec-blue/10 rounded-sm transition-all border border-transparent hover:border-exec-blue/20">
                             <Share2 size={16} />
                           </button>
                        )}
                        <div className="relative">
                          <button onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)} className="text-gray-600 hover:text-white transition-colors p-1">
                            <MoreVertical size={18} />
                          </button>
                          {activeMenuId === item.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-[#0A0A0A] border border-exec-border rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[150]">
                              <div className="p-1">
                                <button onClick={() => openEditModal(item)} className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest">Editar</button>
                                <button onClick={() => handleDelete(item)} className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold text-red-500 hover:bg-red-500/5 transition-all uppercase tracking-widest">Eliminar</button>
                              </div>
                            </div>
                          )}
                        </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
"""

# Identificar los límites actuales
# start_idx at 1073 (index 1072)
# end_idx at 1282 (index 1281)
new_content = lines[:1072] + [grid_block] + lines[1281:]

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_content)
