import { AddHangoutModal } from '@/src/features/hangouts/AddHangoutModal';
import { useCalendarScreen } from '@/src/features/hangouts/useCalendarScreen';
import { monthGrid, MONTHS, WEEKDAYS } from '@/src/lib/dates';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';

const MAX_PHOTOS = 5;

export default function Home() {
  const calendar = useCalendarScreen();

  const cells = monthGrid(calendar.year, calendar.month);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Pressable onPress={calendar.prev} hitSlop={12}>
          <Text style={{ fontSize: 26 }}>‹</Text>
        </Pressable>

        <Text style={{ fontSize: 20, fontWeight: '600' }}>
          {MONTHS[calendar.month]} {calendar.year}
        </Text>

        <Pressable onPress={calendar.next} hitSlop={12}>
          <Text style={{ fontSize: 26 }}>›</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: '#999', fontSize: 12 }}>
            {w}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((date, di) => (
            <View key={di} style={{ flex: 1, aspectRatio: 0.85, padding: 3 }}>
              {date && (
                <Pressable
                  onPress={() => calendar.openAdd(date)}
                  style={{ flex: 1, borderRadius: 8, backgroundColor: '#f4f2ee', padding: 4 }}
                >
                  <Text style={{ fontSize: 11, color: '#666' }}>{Number(date.slice(8))}</Text>

                  {(calendar.byDate[date] || []).map((h) => (
                    <Pressable
                      key={h.id}
                      onPress={() => calendar.openDetail(h)}
                      style={{
                        backgroundColor: `${calendar.circleById[h.circleId]?.color ?? '#999'}33`,
                        borderRadius: 4,
                        paddingHorizontal: 3,
                        paddingVertical: 1,
                        marginTop: 2,
                      }}
                    >
                      <Text numberOfLines={1} style={{ fontSize: 9 }}>
                        {h.title}
                      </Text>
                    </Pressable>
                  ))}
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ))}

      <AddHangoutModal
        openDate={calendar.openDate}
        title={calendar.title}
        note={calendar.note}
        pickedCircle={calendar.pickedCircle}
        addingCircle={calendar.addingCircle}
        newCircleName={calendar.newCircleName}
        circles={calendar.circles}
        onClose={calendar.closeAdd}
        onChangeTitle={calendar.setTitle}
        onChangeNote={calendar.setNote}
        onPickCircle={calendar.setPickedCircle}
        onStartAddCircle={() => calendar.setAddingCircle(true)}
        onChangeNewCircleName={calendar.setNewCircleName}
        onCreateCircle={calendar.createCircle}
        onSubmit={calendar.submit}
      />

      <Modal
        visible={calendar.openHangout !== null}
        transparent
        animationType="slide"
        onRequestClose={() => calendar.setOpenHangout(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
          onPress={() => calendar.setOpenHangout(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <Pressable
              onPress={() => {}}
              style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                paddingBottom: 34,
                gap: 12,
              }}
            >
              {calendar.openHangout && (
                <>
                  <Text style={{ fontSize: 12, color: '#888' }}>{calendar.openHangout.date}</Text>

                  <TextInput
                    placeholder="what did you do?"
                    value={calendar.editTitle}
                    onChangeText={calendar.setEditTitle}
                    style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }}
                  />

                  <TextInput
                    placeholder="who was there / notes"
                    value={calendar.editNote}
                    onChangeText={calendar.setEditNote}
                    style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }}
                  />

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {calendar.circles.map((c) => {
                      const on = calendar.editCircle === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => calendar.setEditCircle(c.id)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 999,
                            borderWidth: 1.5,
                            borderColor: c.color,
                            backgroundColor: on ? c.color : 'transparent',
                          }}
                        >
                          <Text style={{ color: on ? '#fff' : '#333', fontSize: 13 }}>{c.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {calendar.photos.map((p) => (
                      <Pressable key={p.id} onLongPress={() => calendar.removePhoto(p.id)}>
                        <Image source={{ uri: p.uri }} style={{ width: 78, height: 78, borderRadius: 8 }} />
                      </Pressable>
                    ))}

                    {calendar.photos.length < MAX_PHOTOS && (
                      <Pressable
                        onPress={calendar.pickPhoto}
                        style={{
                          width: 78,
                          height: 78,
                          borderRadius: 8,
                          borderWidth: 1.5,
                          borderColor: '#ccc',
                          borderStyle: 'dashed',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 28, color: '#bbb' }}>+</Text>
                      </Pressable>
                    )}
                  </View>

                  <Text style={{ fontSize: 11, color: '#bbb' }}>
                    {calendar.photos.length}/{MAX_PHOTOS} photos · long-press to remove
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Pressable onPress={calendar.removeHangout} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                      <Text style={{ color: '#c0392b' }}>Delete</Text>
                    </Pressable>

                    <View style={{ flex: 1 }} />

                    <Pressable onPress={() => calendar.setOpenHangout(null)} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                      <Text style={{ color: '#666' }}>Cancel</Text>
                    </Pressable>

                    <Pressable onPress={calendar.saveEdits} style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#333' }}>
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
