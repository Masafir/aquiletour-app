import Image from 'next/image';
import { useState, useEffect } from 'react';
import { read, utils, writeFile } from 'xlsx-js-style';

interface Participant {
  name: string;
  id: number;
}

interface RoleMeetup {
  role: string;
  name: string;
  id: number;
}

interface ChosenParticipant {
  p: Participant;
  role: string;
}

export default function Home() {
  const [data, setData] = useState<string[][]>([]);
  const [filename, setFilename] = useState<string>("Choisir un fichier");
  const [roles, setRoles] = useState<string[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [orderParticipants, setOrderParticipants] = useState<string[]>([]);
  const [roleNextMeetUp, setRoleNextMeetUp] = useState<ChosenParticipant[]>([]);
  const [lastRoleMeetUp, setLastRoleMeetUp] = useState<(string | RoleMeetup)[]>([]);
  const [lastMeetUp, setLastMeetUp] = useState<string[]>([]);
  const [nextMeetUp, setNextMeetUp] = useState<string[]>([]);
  const [filledMeetUp, setFilledMeetUp] = useState<boolean>(false);
  const [forEachMode, setForEachMode] = useState<boolean>(true);

  const thisDate = new Date();
  const [date, setDate] = useState<string>(
    `${thisDate.getFullYear()}-${String(thisDate.getMonth() + 1).padStart(2, '0')}-${String(thisDate.getDate()).padStart(2, '0')}`
  );

  const normalizeDate = (data: (string | number)[][]): string[][] => {
    return data.map((row) => {
      return row.map((cell, colIndex) => {
        if (colIndex === 0 && typeof cell === "number") {
          const utcDays = Math.floor(cell - 25569);
          const utcValue = utcDays * 86400;
          const dateInfo = new Date(utcValue * 1000);
          return `${dateInfo.getDate()}/${dateInfo.getMonth() + 1}/${dateInfo.getFullYear()}`;
        }
        return String(cell);
      });
    });
  };

  const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (!evt.target.files?.length) return;
    
    const file = evt.target.files[0];
    const reader = new FileReader();
    
    if (file.name) {
      setFilename(file.name);
    }

    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (!e.target?.result) return;
      
      const bstr = e.target.result;
      const wb = read(bstr as string, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const excelData = utils.sheet_to_json<string[]>(ws, { header: 1 });
      
      const normalizedData = normalizeDate(excelData);
      setData(normalizedData);

      if (excelData[0]?.[0] === "Roles") {
        const roleRow = [...excelData[0]];
        roleRow.shift();
        setRoles(roleRow);
      }

      if (excelData[1]?.[0] === "Date") {
        const participantRow = [...excelData[1]];
        participantRow.shift();
        const newParticipants = participantRow.map((p, id) => ({ name: p, id }));
        setParticipants(newParticipants);

        if (excelData.length > 2) {
          const newLastMeetUp = [...normalizedData[normalizedData.length - 1]];
          setLastMeetUp(newLastMeetUp);
          
          const lastDate = newLastMeetUp[0];
          newLastMeetUp.shift();
          
          const lastRoleMeetUp = newLastMeetUp
            .map((r, id) => ({ role: r, name: participantRow[id], id }))
            .filter(r => r.role !== "-");
            
          setLastRoleMeetUp([lastDate as string | RoleMeetup, ...lastRoleMeetUp]);
        }
      }
    };

    reader.readAsBinaryString(file);
  };

  const exportFile = () => {
    const newNextMeetUp = [...nextMeetUp];
    const newDate = new Date(date);
    newNextMeetUp[0] = `${newDate.getDate()}/${newDate.getMonth() + 1}/${newDate.getFullYear()}`;
    
    const ws = utils.aoa_to_sheet([...data, newNextMeetUp]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "MeetingSheet");
    
    writeFile(wb, `reunion-${date.replace(/\//g, '-')}.xlsx`);
  };

  const fillArray = () => {
    const newArray = [
      `${thisDate.getDate()}/${thisDate.getMonth() + 1}/${thisDate.getFullYear()}`,
      ...Array(participants.length).fill("-")
    ];
    
    const newParticipants = Array(roles.length).fill("-");
    
    setNextMeetUp(newArray);
    setOrderParticipants(newParticipants);
  };

  const chooseParticipant = () => {
    const availableRole = [...roles];
    const availableParticipant = [...participants];
    const meetUp = [...nextMeetUp];
    const chosenParticipants: ChosenParticipant[] = [];

    while (availableRole.length > 0 && availableParticipant.length > 0) {
      const idParticipant = Math.floor(Math.random() * availableParticipant.length);
      const idRole = Math.floor(Math.random() * availableRole.length);
      
      const chosenParticipant = availableParticipant[idParticipant];
      const chosenRole = availableRole[idRole];

      if (lastMeetUp[chosenParticipant.id + 1] !== chosenRole) {
        chosenParticipants.push({ p: chosenParticipant, role: chosenRole });
        availableRole.splice(idRole, 1);
        availableParticipant.splice(idParticipant, 1);
      }
    }

    chosenParticipants.forEach(element => {
      meetUp[element.p.id + 1] = element.role;
    });

    setNextMeetUp(meetUp);
    setRoleNextMeetUp(chosenParticipants);
    setFilledMeetUp(true);
  };

  const chooseParticipantByRole = (role: string, index: number) => {
    const oldRoleIdMeetUp = nextMeetUp.findIndex(oldRole => oldRole === role);
    const newMeetUp = [...nextMeetUp];
    const newOrderParticipants = [...orderParticipants];

    let isChoose = false;
    while (!isChoose) {
      const idParticipant = Math.floor(Math.random() * participants.length);
      const participant = participants[idParticipant];
      
      if (oldRoleIdMeetUp > 0) {
        newMeetUp[oldRoleIdMeetUp] = "-";
      }
      
      if (lastMeetUp[participant.id] !== role && !newOrderParticipants.includes(participant.name)) {
        newMeetUp[idParticipant + 1] = role;
        newOrderParticipants[index] = participant.name;
        isChoose = true;
        
        setNextMeetUp(newMeetUp);
        setOrderParticipants(newOrderParticipants);
      }
    }
  };

  useEffect(() => {
    fillArray();
  }, [participants]);

  const reset = () => {
    fillArray();
    setFilledMeetUp(false);
  };

  const handleSwitchMode = () => {
    fillArray();
    setForEachMode(!forEachMode);
  };

  const handleDate = (value: string) => {
    setDate(value);
  };

  return (
    <div className="w-full flex justify-center flex-col items-center text-white overflow-hidden">
      <div className="w-[70%] mx-auto p-5 sm:w-full sm:p-0">
        {/* Header */}
        <div className="p-5 flex justify-center items-center flex-column">
          <Image
            src="/icons/icon.png"
            alt="Logo"
            width={100}
            height={100}
            className="w-[100px] h-[100px]"
          />
          <h1 className="text-3xl text-center m-2">A qui le tour ?</h1>
        </div>

        {/* Info */}
        <div>
          <p className="text-gray-400 p-0 text-center">
            Pour commencer veuillez charger un fichier excel déjà formaté
          </p>
        </div>

        {/* File Input */}
        <div className="w-full flex justify-center p-5 sm:p-0">
          <input
            id="file"
            name="file"
            type="file"
            onChange={handleChange}
            className="hidden"
          />
          <label
            htmlFor="file"
            className="flex justify-around text-xl font-bold text-white bg-blue-500 px-4 py-2 rounded cursor-pointer hover:bg-blue-600"
          >
            {filename}
          </label>
        </div>

        {/* Lists Container */}
        <div className="flex justify-center">
          {roles.length > 0 && (
            <div className="border border-gray-300 rounded-lg my-4 mx-2 overflow-hidden">
              <div>
                <div className="bg-yellow-400 text-gray-900 text-center font-bold p-2">
                  Rôles
                </div>
              </div>
              <div className="flex flex-col overflow-y-auto h-[150px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-900">
                {roles.map((role, index) => (
                  <div key={index} className="p-4">
                    {role}
                  </div>
                ))}
              </div>
            </div>
          )}

          {participants.length > 0 && (
            <div className="border border-gray-300 rounded-lg my-4 mx-2 overflow-hidden">
              <div>
                <div className="bg-yellow-400 text-gray-900 text-center font-bold p-2">
                  Participants
                </div>
              </div>
              <div className="flex flex-col overflow-y-auto h-[150px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-900">
                {participants.map((part, index) => (
                  <div key={index} className="p-4">
                    {part.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Last Meeting Table */}
        {lastMeetUp.length > 0 && (
          <table className="text-white border border-gray-300 rounded-lg my-4 mx-auto border-spacing-0 overflow-hidden sm:text-sm">
            <caption className="text-white">Dernière réunion en date</caption>
            <tr>
              <th className="bg-yellow-400 text-gray-900 p-2">Date</th>
              {roles.map((role, index) => (
                <th key={index} className="bg-yellow-400 text-gray-900 p-2">
                  {role}
                </th>
              ))}
            </tr>
            <tr>
              {lastRoleMeetUp.map((part, id) =>
                id === 0 ? (
                  <td key={id} className="border-b border-gray-300 p-2 text-center">
                    {part as string}
                  </td>
                ) : lastRoleMeetUp.find(
                    (p) => typeof p !== 'string' && p.name && roles[id - 1] === p.role
                  ) ? (
                  <td key={id} className="border-b border-gray-300 p-2 text-center">
                    {
                      (lastRoleMeetUp.find(
                        (p) => typeof p !== 'string' && p.name && roles[id - 1] === p.role
                      ) as RoleMeetup)?.name
                    }
                  </td>
                ) : null
              )}
            </tr>
          </table>
        )}

        {/* Options Container */}
        {participants.length > 0 && (
          <div className="flex justify-center items-end p-2 sm:flex-col sm:items-center">
            <div className="flex justify-center items-center">
              <div className="border border-white rounded-lg flex">
                <div
                  onClick={() => handleSwitchMode()}
                  className={`cursor-pointer rounded-lg m-2 p-2 ${
                    forEachMode
                      ? 'text-gray-900 bg-yellow-400 font-bold'
                      : 'text-white font-light'
                  }`}
                >
                  Par Participant
                </div>
                <div
                  onClick={() => handleSwitchMode()}
                  className={`cursor-pointer rounded-lg m-2 p-2 ${
                    !forEachMode
                      ? 'text-gray-900 bg-yellow-400 font-bold'
                      : 'text-white font-light'
                  }`}
                >
                  Aléatoire
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-start items-center ml-4 sm:mt-2 sm:ml-0">
              <label htmlFor="date">Date de la prochaine réunion</label>
              <input
                type="date"
                name="date"
                value={date}
                onChange={(e) => handleDate(e.target.value)}
                className="p-2 font-bold border-2 border-gray-300 rounded-lg h-[44px] hover:border-blue-500 bg-transparent text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:brightness-[100]"
              />
            </div>
          </div>
        )}

        {/* Role Selection */}
        {forEachMode ? (
          <div className="flex justify-center items-center">
            {roles.map((role, id) => (
              <div key={id} className="p-4 m-2">
                <div className="p-2 font-bold">{role}</div>
                <button
                  onClick={() => chooseParticipantByRole(role, id)}
                  className="text-xl font-bold text-white bg-blue-500 px-4 py-2 rounded cursor-pointer hover:bg-blue-600"
                >
                  Lancer
                </button>
                <div className="text-center">{orderParticipants[id]}</div>
              </div>
            ))}
          </div>
        ) : filledMeetUp ? (
          <table className="text-white border border-gray-300 rounded-lg my-4 mx-auto border-spacing-0 overflow-hidden sm:text-sm">
            <caption className="text-white">Prochaine Réunion</caption>
            <tr>
              {roleNextMeetUp.map((part, index) => (
                <th key={index} className="bg-yellow-400 text-gray-900 p-2">
                  {part.role}
                </th>
              ))}
            </tr>
            <tr>
              {roleNextMeetUp.map((mt, index) => (
                <td key={index} className="border-b border-gray-300 p-2 text-center">
                  {mt.p.name}
                </td>
              ))}
            </tr>
          </table>
        ) : (
          roles.length > 0 && (
            <p className="text-gray-400 text-center">
              Lancer le tirage pour savoir quelle sera la prochaine line up
            </p>
          )
        )}

        {/* Action Buttons */}
        <div className="flex justify-around p-2 flex-wrap">
          {roles.length > 0 && !filledMeetUp && !forEachMode ? (
            <button
              onClick={() => chooseParticipant()}
              className="text-xl font-bold text-white bg-blue-500 px-4 py-2 m-2 rounded cursor-pointer hover:bg-blue-600"
            >
              A qui le tour ?
            </button>
          ) : (
            filledMeetUp && (
              <button
                onClick={() => reset()}
                className="text-xl font-bold text-white bg-blue-500 px-4 py-2 m-2 rounded cursor-pointer hover:bg-blue-600"
              >
                Recommencer le tirage
              </button>
            )
          )}

          {(participants.length > 0 && forEachMode) || filledMeetUp ? (
            <button
              onClick={() => exportFile()}
              className="text-xl font-bold text-white bg-blue-500 px-4 py-2 m-2 rounded cursor-pointer hover:bg-blue-600"
            >
              Exporter le fichier
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
