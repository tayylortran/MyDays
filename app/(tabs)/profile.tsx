import { useRepo } from '@/src/data/RepositoryProvider';
import { Photo } from '@/src/data/types';
import { monthGrid, MONTHS, WEEKDAYS } from '@/src/lib/dates';
import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';

export default function Profile() {
  const repo = useRepo();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [faces, setFaces] = useState<Record<string, string>>({}); // date -> uri

  // day picker state
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [dayPhotos, setDayPhotos] = useState<Photo[]>([]);

  const load = useCallback(async () => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    setFaces(await repo.faceUrisForMonth(key));
  }, [repo, year, month]);

  useEffect(() => { load(); }, [load]);

  const prev = () => { if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1); };
  const next = () => { if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1); };

  const openDay = async (date: string) => {
    const photos = await repo.listPhotosForDate(date);
    if (photos.length === 0) return; // nothing to choose from
    setDayPhotos(photos);
    setOpenDate(date);
  };

  const chooseFace = async (photoId: string) => {
    if (!openDate) return;
    await repo.setDayFace(openDate, photoId);
    setOpenDate(null);
    await load();
  };

  const cells = monthGrid(year, month);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Pressable onPress={prev} hitSlop={12}><Text style={{ fontSize: 26 }}>‹</Text></Pressable>
        <Text style={{ fontSize: 20, fontWeight: '600' }}>{MONTHS[month]} {year}</Text>
        <Pressable onPress={next} hitSlop={12}><Text style={{ fontSize: 26 }}>›</Text></Pressable>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: '#999', fontSize: 12 }}>{w}</Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((date, di) => (
            <View key={di} style={{ flex: 1, aspectRatio: 0.85, padding: 2 }}>
              {date && (
                <Pressable onPress={() => openDay(date)} style={{ flex: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f4f2ee' }}>
                  {faces[date] ? (
                    <Image source={{ uri: faces[date] }} style={{ flex: 1 }} />
                  ) : (
                    <Text style={{ fontSize: 11, color: '#bbb', padding: 4 }}>{Number(date.slice(8))}</Text>
                  )}
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ))}

      {/* choose-a-face sheet */}
      <Modal visible={openDate !== null} transparent animationType="slide" onRequestClose={() => setOpenDate(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setOpenDate(null)}>
          <Pressable onPress={() => {}} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34, gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Pick this day's photo</Text>
            <Text style={{ fontSize: 12, color: '#888' }}>{openDate}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {dayPhotos.map((p) => (
                <Pressable key={p.id} onPress={() => chooseFace(p.id)}>
                  <Image source={{ uri: p.uri }} style={{ width: 96, height: 96, borderRadius: 8 }} />
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}