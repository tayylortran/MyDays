import { CalendarGrid } from '@/src/features/calendar/CalendarGrid';
import { MonthHeader } from '@/src/features/calendar/MonthHeader';
import { AddHangoutModal } from '@/src/features/hangouts/AddHangoutModal';
import { HangoutDetailModal } from '@/src/features/hangouts/HangoutDetailModal';
import { useCalendarScreen } from '@/src/features/hangouts/useCalendarScreen';
import { Text, View } from 'react-native';

export default function Home() {
  const calendar = useCalendarScreen(); //calls the brain and stores everything it hands back as a variable called calendar. 
  //it holds all the actions and data for this screen. 

  return (
    <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 8 }}>
      <MonthHeader //component
        month={calendar.month} //"passing props".
        year={calendar.year}
        onPrev={calendar.prev}
        onNext={calendar.next}
      />

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          marginBottom: 10,
          paddingHorizontal: 2,
        }}
      >
        {calendar.circles.map((c) => (
          <View
            key={c.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: c.color,
            }}
          />
          <Text style={{ fontSize: 12, color: '#555' }}>
            {c.name}
          </Text>
        </View>
        ))}
      </View>

      <CalendarGrid //component
        year={calendar.year}
        month={calendar.month}
        byDate={calendar.byDate}
        circleById={calendar.circleById}
        onPressDay={calendar.openAdd}
        onPressHangout={calendar.openDetail}
      />

      <AddHangoutModal //component
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

      <HangoutDetailModal //component
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
