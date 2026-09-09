import { CalendarGrid } from '@/src/features/calendar/CalendarGrid';
import { MonthHeader } from '@/src/features/calendar/MonthHeader';
import { AddHangoutModal } from '@/src/features/hangouts/AddHangoutModal';
import { EditCircleModal } from '@/src/features/hangouts/EditCircleModal';
import { HangoutDetailModal } from '@/src/features/hangouts/HangoutDetailModal';
import { useCalendarScreen } from '@/src/features/hangouts/useCalendarScreen';
import { Pressable, Text, View } from 'react-native';

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
          <Pressable
            key={c.id}
            onPress={() => calendar.openEditCircle(c)}
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
          </Pressable>
        ))}

        <Pressable onPress={calendar.openCreateCircle}>
          <Text style={{ fontSize: 18, color: '#555' }}>+</Text>
        </Pressable>
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
        circles={calendar.circles}
        onClose={calendar.closeAdd}
        onChangeTitle={calendar.setTitle}
        onChangeNote={calendar.setNote}
        onPickCircle={calendar.setPickedCircle}
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

      <EditCircleModal
        editingCircle={calendar.editingCircle}
        creatingCircle={calendar.creatingCircle}
        newCircleName={calendar.newCircleName}
        circleColor={calendar.circleColor}
        circles={calendar.circles}
        deletingCircle={calendar.deletingCircle}
        circleHangoutCount={calendar.circleHangoutCount}
        deleteDestinationId={calendar.deleteDestinationId}
        onClose={calendar.closeCircleModal}
        onChangeNewCircleName={calendar.setNewCircleName}
        onChangeCircleColor={calendar.setCircleColor}
        onSaveCircle={calendar.saveCircle}
        onStartDelete={calendar.startDeleteCircle}
        onCancelDelete={calendar.cancelDeleteCircle}
        onChangeDeleteDestination={calendar.setDeleteDestinationId}
        onDelete={calendar.deleteCircle}
      />
    </View>
  );
}
