import { useState } from 'react'
import { X, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '../lib/utils'
import { useArcalistStore } from '../store/useArcalistStore'
import type { Bookmark } from '../types'

type Props = {
  bookmark: Bookmark
  boardId: string
}

export function BookmarkItem({ bookmark, boardId }: Props) {
  const deleteBookmark = useArcalistStore((state) => state.deleteBookmark)
  const [imgError, setImgError] = useState(false)

  // useSortable gives us everything we need to make this item draggable
    const {
      attributes,      // aria attributes for accessibility
      listeners,       // mouse/touch event listeners for the drag handle
      setNodeRef,      // ref to attach to the DOM element
      transform,       // current drag transform (x/y offset)
      transition,      // smooth transition when items shift
      isDragging,      // true while this item is being dragged
    } = useSortable({
      id: bookmark.id,
      // Pass boardId so DndContext knows which board this bookmark belongs to
      data: { type: 'bookmark', boardId, bookmark },
    })
  
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      // Hide the original item while dragging (DragOverlay takes its place)
      opacity: isDragging ? 0 : 1,
    }
  
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-2 transition-colors duration-150"
      >
        {/* Drag handle — only the grip icon triggers dragging */}
        <button
          {...attributes}
          {...listeners}
          className={cn(
            'opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
            'text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing',
            'touch-none' // required for dnd-kit touch support
          )}
        >
          <GripVertical size={12} />
        </button>
  
        {/* Clickable link area */}
        <button
          onClick={() => window.open(bookmark.url, '_self')}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {!imgError ? (
            <img
              src={bookmark.favicon}
              alt=""
              className="w-4 h-4 rounded-sm shrink-0"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-4 h-4 rounded-sm shrink-0 bg-surface-2 flex items-center justify-center">
              <span className="text-[8px] text-slate-400 font-bold uppercase">
                {bookmark.title.charAt(0)}
              </span>
            </div>
          )}
          <span className="truncate text-sm text-slate-300 group-hover:text-white leading-none">
            {bookmark.title}
          </span>
        </button>
  
        {/* Delete */}
        <button
          onClick={() => deleteBookmark(boardId, bookmark.id)}
          className={cn(
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'w-4 h-4 flex items-center justify-center shrink-0',
            'text-slate-600 hover:text-red-400'
          )}
        >
          <X size={10} />
        </button>
      </div>
    )
}
