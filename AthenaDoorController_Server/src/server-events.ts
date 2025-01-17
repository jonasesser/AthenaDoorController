import * as alt from 'alt-server';
import Database from '@stuyk/ezmongodb';
import IDoorControl from './interfaces/IDoorControl';

import { createDoor, doorInteraction, updateLockstate } from './server-functions';
import { ServerTextLabelController } from '../../../server/streamers/textlabel';
import { InteractionController } from '../../../server/systems/interaction';
import { playerFuncs } from '../../../server/extensions/Player';
import { ATHENA_DOORCONTROLLER, settings, Translations } from '../index';

alt.onClient('DoorController:Server:AddDoor', (player: alt.Player, doorData: IDoorControl) => {
	createDoor(player, doorData);
});

alt.onClient('DoorController:Server:UpdateLockstate', async (player:alt.Player) => {
	const doors = await Database.fetchAllData<IDoorControl>('doors');
	doors.forEach(async (door, index) => {
		if(player.pos.isInRange(door.pos, 3)) {
			switch(door.data.isLocked) {
				case true: {
					door.data.isLocked = false;
					if(settings.doorTextEnabled) {
						ServerTextLabelController.remove(`door-${door._id.toString()}`);
						ServerTextLabelController.append({
							pos: { x: door.center.x, y: door.center.y, z: door.center.z },
							data: `~r~${Translations.LOCKED}`,
							uid: `door-${door._id.toString()}`,
							maxDistance: 3,
						});
					}
					playerFuncs.emit.notification(player, `Door is now unlocked.`);
					await updateLockstate(door._id, door.data.isLocked);
					alt.emitClient(player, 'DoorController:Vue:CloseUI');
					break;
				}
				case false: {
					door.data.isLocked = true;
					if(settings.doorTextEnabled) {
						ServerTextLabelController.remove(`door-${door._id.toString()}`);
						ServerTextLabelController.append({
							pos: { x: door.center.x, y: door.center.y, z: door.center.z },
							data: `~r~${Translations.LOCKED}`,
							uid: `door-${door._id.toString()}`,
							maxDistance: 3,
						});
					}
					playerFuncs.emit.notification(player, `Door is now locked.`);
					await updateLockstate(door._id, door.data.isLocked);
					alt.emitClient(player, 'DoorController:Vue:CloseUI');
					break;
				}
				default: {
					break;
				}
			}
		}
	});
});

alt.onClient('DoorController:Server:RemoveDoor', async (player: alt.Player) => {
	const doors = await Database.fetchAllData<IDoorControl>('doors');
	doors.forEach(async (door, index) => {
		if (player.pos.isInRange(door.pos as alt.Vector3, 2)) {
			playerFuncs.emit.notification(player, `Successfully removed door with the prop ${door.name} and the hash: ${door.data.hash}.`);
			alt.setTimeout(() => {
				InteractionController.remove(doorInteraction.getType(), doorInteraction.getIdentifier());
				ServerTextLabelController.remove(`door-${door._id.toString()}`);
			}, 500);
			door.data.isLocked = false;
			updateLockstate(door._id, false);
			await Database.deleteById(door._id, 'doors');
		}
		return true;
	});
});

alt.onClient('DoorController:Server:ReadDoorData', async (player: alt.Player) => {
	const allDoors = await Database.fetchAllData<IDoorControl>(settings.collectionName);
	allDoors.forEach((door, index) => {
		if(player.pos.isInRange(door.pos, 2)) {
			playerFuncs.emit.message(player, `==> {01DF01} ${ATHENA_DOORCONTROLLER.name} ${ATHENA_DOORCONTROLLER.version}{FFFFFF} <==`);
			playerFuncs.emit.message(player, `==> Door ID: {01DF01}${door._id}`);
			playerFuncs.emit.message(player, `==> Door Name: {01DF01}${door.name}`);
			playerFuncs.emit.message(player, `==> Door Prop: {01DF01}${door.data.prop}`);
			playerFuncs.emit.message(player, `==> Door Faction: {01DF01}${door.data.faction}`);
			alt.emitClient(player, 'DoorController:Vue:CloseUI');
		}
	});
});

alt.onClient('DoorController:Server:CheckPermissions', (player: alt.Player) => {
	if(player.accountData.permissionLevel >= settings.requiredPermissionLevel) {
		alt.emitClient(player, 'DoorController:Client:PermissionGranted');
	} else {
		return false;
	}
	return true;
});