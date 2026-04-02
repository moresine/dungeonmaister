import { useEffect, useState } from 'react';
import { db, type Character } from '../../db/db';
import { Shield, Sword, Heart, Star, BookOpen, Briefcase } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '0.5rem',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {props.id}
    </div>
  );
}

interface PlayerViewProps {
  characterId: number;
}

export const PlayerView = ({ characterId }: PlayerViewProps) => {
  const [character, setCharacter] = useState<Character | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadChar = async () => {
      if (characterId) {
        const char = await db.characters.get(characterId);
        if (char && (!char.inventory || char.inventory.length === 0)) {
          char.inventory = ['Health Potion', 'Sword of Ogre Decapitation'];
        }
        setCharacter(char || null);
      }
    };
    loadChar();
  }, [characterId]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (character && active.id !== over.id) {
      const oldIndex = character.inventory.indexOf(active.id);
      const newIndex = character.inventory.indexOf(over.id);

      const newInventory = arrayMove(character.inventory, oldIndex, newIndex);

      setCharacter({
        ...character,
        inventory: newInventory,
      });

      db.characters.update(characterId, { inventory: newInventory });
    }
  };

  if (!character) {
    return (
      <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--text-secondary)' }}>Select a character to view their sheet.</h3>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.5rem', color: 'var(--accent-gold)', marginBottom: '0.25rem' }}>{character.name}</h3>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Level {character.level} {character.race} {character.charClass}</div>
        </div>
        <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-danger)', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Heart size={14} /> {character.hp}/{character.maxHp}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Sword size={16} /> STR: {character.stats.str}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={16} /> DEX: {character.stats.dex}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Heart size={16} /> CON: {character.stats.con}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={16} /> INT: {character.stats.int}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Star size={16} /> WIS: {character.stats.wis}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Star size={16} /> CHA: {character.stats.cha}</div>
      </div>

      <div>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>
          <Briefcase size={16} /> Inventory
        </h4>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={character.inventory}
            strategy={verticalListSortingStrategy}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {character.inventory.map(item => <SortableItem key={item} id={item} />)}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
