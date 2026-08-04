import { useRepo } from '@/src/data/RepositoryProvider';
import { Circle, Hangout } from '@/src/data/types';
import { monthGrid, MONTHS, WEEKDAYS } from '@/src/lib/dates';
import { newId } from '@/src/lib/id';
import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';

export default function Home() {
  const repo = useRepo();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [circles, setCircles] = useState<Circle[]>([]);
  const [hangouts, setHangouts] = useState<Hangout[]>([]);

  // add-hangout modal state
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [pickedCircle, setPickedCircle] = useState<string | null>(null);

  // new-circle inline form state
  const [addingCircle, setAddingCircle] = useState(false);
  const [newCircleName, setNewCircleName] = useState('');

  // detail / edit modal state
  const [openHangout, setOpenHangout] = useState<Hangout | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCircle, setEditCircle] = useState<string | null>(null);

  const load = useCallback(async () => {
    setCircles(await repo.listCircles());
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    setHangouts(await repo.listHangouts(key));
  }, [repo, year, month]);

  useEffect(() => { load(); }, [load]);

  const circleById: Record<string, Circle> = {};
  circles.forEach((c) => (circleById[c.id] = c));

  const byDate: Record<string, Hangout[]> = {};
  hangouts.forEach((h) => { (byDate[h.date] ||= []).push(h); });

  const prev = () => { if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1); };
  const next = () => { if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1); };

  const openAdd = (date: string) => {
    setOpenDate(date);
    setTitle('');
    setNote('');
    setPickedCircle(circles[0]?.id ?? null);
    setAddingCircle(false);
    setNewCircleName('');
  };
  const closeAdd = () => setOpenDate(null);

  const createCircle = async () => {
    const name = newCircleName.trim();
    if (!name) return;
    const palette = ['#E8674C', '#E0A73E', '#4C86E8', '#7B61C9', '#3FA372', '#D65B9A'];
    const id = newId();
    await repo.saveCircle({
      id,
      name,
      color: palette[circles.length % palette.length],
      sort: circles.length,
      updatedAt: Date.now(),
    });
    setCircles(await repo.listCircles());
    setPickedCircle(id);
    setAddingCircle(false);
    setNewCircleName('');
  };

  const submit = async () => {
    if (!openDate || !pickedCircle) { Alert.alert('Add a circle first'); return; }
    if (!title.trim()) { Alert.alert('Add a title first'); return; }
    try {
      await repo.saveHangout({
        id: newId(),
        date: openDate,
        title: title.trim(),
        note: note.trim(),
        circleId: pickedCircle,
        updatedAt: Date.now(),
      });
      closeAdd();
      await load();
    } catch (e: any) {
      Alert.alert('Could not save', String(e?.message ?? e));
    }
  };

  const openDetail = (h: Hangout) => {
    setOpenHangout(h);
    setEditTitle(h.title);
    setEditNote(h.note);
    setEditCircle(h.circleId);
  };

  const saveEdits = async () => {
    if (!openHangout || !editCircle) { Alert.alert('Pick a circle'); return; }
    if (!editTitle.trim()) { Alert.alert('Add a title first'); return; }
    await repo.saveHangout({
      ...openHangout,
      title: editTitle.trim(),
      note: editNote.trim(),
      circleId: editCircle,
      updatedAt: Date.now(),
    });
    setOpenHangout(null);
    await load();
  };

  const removeHangout = async () => {
    if (!openHangout) return;
    await repo.deleteHangout(openHangout.id);
    setOpenHangout(null);
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
            <View key={di} style={{ flex: 1, aspectRatio: 0.85, padding: 3 }}>
              {date && (
                <Pressable onPress={() => openAdd(date)} style={{ flex: 1, borderRadius: 8, backgroundColor: '#f4f2ee', padding: 4 }}>
                  <Text style={{ fontSize: 11, color: '#666' }}>{Number(date.slice(8))}</Text>
                  {(byDate[date] || []).map((h) => (
                    <Pressable key={h.id} onPress={() => openDetail(h)} style={{ backgroundColor: (circleById[h.circleId]?.color ?? '#999') + '33', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1, marginTop: 2 }}>
                      <Text numberOfLines={1} style={{ fontSize: 9 }}>{h.title}</Text>
                    </Pressable>
                  ))}
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ))}

      {/* add-hangout bottom sheet */}
      <Modal visible={openDate !== null} transparent animationType="slide" onRequestClose={closeAdd}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={closeAdd}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable onPress={() => {}} style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34, gap: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>New hangout · {openDate}</Text>

              <TextInput
                autoFocus
                placeholder="what did you do?"
                value={title}
                onChangeText={setTitle}
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }}
              />

              <TextInput
                placeholder="who was there / notes (optional)"
                value={note}
                onChangeText={setNote}
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }}
              />

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {circles.map((c) => {
                  const on = pickedCircle === c.id;
                  return (
                    <Pressable key={c.id} onPress={() => setPickedCircle(c.id)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: c.color, backgroundColor: on ? c.color : 'transparent' }}>
                      <Text style={{ color: on ? '#fff' : '#333', fontSize: 13 }}>{c.name}</Text>
                    </Pressable>
                  );
                })}
                <Pressable onPress={() => setAddingCircle(true)}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: '#bbb', borderStyle: 'dashed' }}>
                  <Text style={{ color: '#777', fontSize: 13 }}>+ circle</Text>
                </Pressable>
              </View>

              {addingCircle && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    autoFocus
                    placeholder="circle name"
                    value={newCircleName}
                    onChangeText={setNewCircleName}
                    onSubmitEditing={createCircle}
                    style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 }}
                  />
                  <Pressable onPress={createCircle} style={{ paddingHorizontal: 14, justifyContent: 'center', borderRadius: 10, backgroundColor: '#333' }}>
                    <Text style={{ color: '#fff' }}>Save</Text>
                  </Pressable>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <Pressable onPress={closeAdd} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Text style={{ color: '#666' }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={submit} style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#333' }}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Add</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* hangout detail / edit bottom sheet */}
      <Modal visible={openHangout !== null} transparent animationType="slide" onRequestClose={() => setOpenHangout(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setOpenHangout(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable onPress={() => {}} style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34, gap: 12 }}>
              {openHangout && (
                <>
                  <Text style={{ fontSize: 12, color: '#888' }}>{openHangout.date}</Text>

                  <TextInput
                    placeholder="what did you do?"
                    value={editTitle}
                    onChangeText={setEditTitle}
                    style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }}
                  />
                  <TextInput
                    placeholder="who was there / notes"
                    value={editNote}
                    onChangeText={setEditNote}
                    style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }}
                  />

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {circles.map((c) => {
                      const on = editCircle === c.id;
                      return (
                        <Pressable key={c.id} onPress={() => setEditCircle(c.id)}
                          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: c.color, backgroundColor: on ? c.color : 'transparent' }}>
                          <Text style={{ color: on ? '#fff' : '#333', fontSize: 13 }}>{c.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>Photos will go here</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Pressable onPress={removeHangout} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                      <Text style={{ color: '#c0392b' }}>Delete</Text>
                    </Pressable>
                    <View style={{ flex: 1 }} />
                    <Pressable onPress={() => setOpenHangout(null)} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                      <Text style={{ color: '#666' }}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={saveEdits} style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#333' }}>
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}