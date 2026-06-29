import os

path = r'd:\Sistema oficial de Gestion ACS\components\resources\MediaManagement.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Localizar los límites correctos de nuevo
start_line = -1
for i, line in enumerate(lines):
    if '{loading ? (' in line and i > 1000:
        start_line = i
        break

if start_line == -1:
    print("Could not find start branch")
    exit(1)

# Encontrar el final del DESKTOP_LAYOUT (donde cierra el wrapper div y el const)
end_line = -1
for i in range(start_line, len(lines)):
    if 'return (' in lines[i] or 'MOBILE_LAYOUT' in lines[i] or 'export default' in lines[i]:
        # Buscar el ");" más cercano hacia arriba
        for j in range(i, start_line, -1):
            if ');' in lines[j]:
                end_line = j
                break
        if end_line != -1: break

if end_line == -1:
    print("Could not find end branch")
    exit(1)

# Definir bloques con saltos de línea REALES
grid_block = """      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.filter(i => (i.category || 'facebook').includes(activeCategory)).map(item => (
            <div key={item.id} className="bg-exec-card-bg border border-exec-border group flex flex-col h-full relative transition-all duration-500 hover:border-exec-blue/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <div className="w-full bg-[#050505] border-b border-exec-border relative overflow-hidden flex items-center justify-center group-hover:bg-black transition-colors min-h-[220px] max-h-[320px]">
                {item.task?.completion_files && item.task.completion_files.length > 0 ? (
                  <SafeImage src={item.task.completion_files[0]} alt={item.title} className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-exec-slate/10 py-10">
                    {item.content_type === 'video' ? <Video size={40} /> : <ImageIcon size={40} />}
                  </div>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-sm font-bold text-white mb-1 uppercase">{item.title}</h3>
                <p className="text-[10px] text-gray-500 line-clamp-2">{item.description}</p>
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <span className="text-[9px] text-gray-400">{new Date(item.target_date).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openEditModal(item)} className="p-1.5 text-exec-blue"><Sparkles size={14}/></button>
                     <button onClick={() => handleDelete(item)} className="p-1.5 text-red-500"><X size={14}/></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
"""

table_block = """      ) : (
        <div className="exec-card p-0 overflow-hidden bg-[#0A0A0A] border-exec-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-exec-border bg-[#050505]">
                <th className="p-4 text-[10px] font-black text-gray-500 uppercase">Título</th>
                <th className="p-4 text-[10px] font-black text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-exec-border/30">
              {items.filter(i => (i.category || 'facebook').includes(activeCategory)).map(item => (
                <tr key={item.id}>
                  <td className="p-4 text-xs font-bold text-white uppercase">{item.title}</td>
                  <td className="p-4"><span className="text-[8px] border px-2 py-0.5">{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
"""

final_lines = lines[:start_line] + [
    "      {loading ? (\n",
    "        <div className=\"flex items-center justify-center py-20\">\n",
    "          <div className=\"animate-spin rounded-full h-10 w-10 border-b-2 border-exec-blue\"></div>\n",
    "        </div>\n",
    "      ) : items.length === 0 ? (\n",
    "        <div className=\"text-center py-20 bg-[#0A0A0A] border border-dashed border-exec-border rounded-sm\">\n",
    "          <ImageIcon className=\"mx-auto text-gray-700 mb-4\" size={48} />\n",
    "          <p className=\"text-gray-500 font-medium\">No hay contenidos planificados aún.</p>\n",
    "        </div>\n",
    grid_block,
    table_block,
    "    </div>\n",
    "  );\n"
] + lines[end_line+1:]

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)
print("Done")
