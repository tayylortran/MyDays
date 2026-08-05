import { AddHangoutModal } from '@/src/features/hangouts/AddHangoutModal';
import { HangoutDetailModal } from '@/src/features/hangouts/HangoutDetailModal';
import { useCalendarScreen } from '@/src/features/hangouts/useCalendarScreen';
import { monthGrid, MONTHS, WEEKDAYS } from '@/src/lib/dates';
import { Pressable, Text, View } from 'react-native';

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
          <Text style={{ fontSize: 26 }}>â€¹</Text>
        </Pressable>

        <Text style={{ fontSize: 20, fontWeight: '600' }}>
          {MONTHS[calendar.month]} {calendar.year}
        </Text>

        <Pressable onPress={calendar.next} hitSlop={12}>
          <Text style={{ fontSize: 26 }}>â€º</Text>
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

      <HangoutDetailModal
        openHangout={calendar.openHangout}
        editTitle={calendar.editTitle}
        editNote={calendar.editNote}
        editCircle={calendar.editCircle}
        circles={calendar.circles}
        photos={calendar.photos}
        onClose={() => calendar.setOpenHangout(null)}
        onChangeTitle={calendar.setEditTitle}
        onChangeNote={calendar.setEditNote}
        onPickCircle={calendar.setEditCircle}
        onPickPhoto={calendar.pickPhoto}
        onRemovePhoto={calendar.removePhoto}
        onRemoveHangout={calendar.removeHangout}
        onSave={calendar.saveEdits}
      />
    </View>
  );
}
