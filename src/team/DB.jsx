import React, { useState } from 'react';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import {
  faTrash,
  faClipboardList,
  faUserTie,
  faUsers,
  faSpinner,
  faExclamationTriangle,
  faSearch,
  faCheckCircle,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

import Navbar from '../Navbar';

import {
  deleteDoc,
  doc,
} from 'firebase/firestore';

import { db } from '../Firebase';


/* =========================================================
   FIREBASE CONFIG
========================================================= */

const FIREBASE_API_KEY =
  'AIzaSyCFtnPLJJ2plbMSv3DY6WK-JWLdQ_oWQFQ';

const PROJECT_ID = 'snipify-bda1e';

const CHUNK = 25;


/* =========================================================
   DATE HELPERS
========================================================= */

/*
 * Display ke liye exact timestamp.
 */
const formatExactTimestamp = (date) => {
  if (!date) return '';

  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};


/*
 * ISO format.
 */
const formatISO = (date) => {
  if (!date) return '';

  return date.toISOString();
};


/*
 * Local date + local time ko Date object mein convert karta hai.

 * Example:
 * 2026-08-10
 * 15:30:25

 * => local browser time ka Date object
 */
const createCustomDate = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) {
    return null;
  }

  const date = new Date(`${dateValue}T${timeValue}`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};


/* =========================================================
   FIRESTORE REST SCANNER
========================================================= */

const listAllViaRest = async (collectionName) => {
  const base =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/databases/(default)/documents/${collectionName}`;

  let token = '';

  const all = [];

  do {
    const url =
      `${base}?key=${FIREBASE_API_KEY}&pageSize=300` +
      (
        token
          ? `&pageToken=${encodeURIComponent(token)}`
          : ''
      );

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text().catch(() => '');

      throw new Error(
        `REST API error ${response.status}` +
        `${text ? `: ${text}` : ''}`
      );
    }

    const json = await response.json();

    /*
     * Firestore REST response ke documents.
     */
    (json.documents || []).forEach((item) => {
      const id = item.name.split('/').pop();

      let createTime = null;

      if (item.createTime) {
        const parsed = new Date(item.createTime);

        if (!Number.isNaN(parsed.getTime())) {
          createTime = parsed;
        }
      }

      all.push({
        id,
        createTime,
      });
    });

    token = json.nextPageToken || '';

  } while (token);

  return all;
};


/* =========================================================
   DELETE FUNCTION
========================================================= */

/*
 * Documents ko chunks mein delete karta hai.
 *
 * Har successful delete ke baad progress update hota hai.
 */
const deleteDocumentsWithProgress = async (
  docs,
  collectionName,
  onProgress
) => {
  let deleted = 0;

  for (
    let i = 0;
    i < docs.length;
    i += CHUNK
  ) {
    const chunk = docs.slice(i, i + CHUNK);

    await Promise.all(
      chunk.map(async (item) => {
        await deleteDoc(
          doc(
            db,
            collectionName,
            item.id
          )
        );

        deleted += 1;

        onProgress({
          deleted,
          total: docs.length,
          id: item.id,
          createTime: item.createTime,
        });
      })
    );
  }

  return deleted;
};


/* =========================================================
   CLEANUP CARD
========================================================= */

const CleanupCard = ({
  title,
  collectionName,
  icon,
  description,
  isMobileView,
  onMessage,
}) => {

  /* -------------------------------------------------------
     STATES
  ------------------------------------------------------- */

  const [scanning, setScanning] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [docs, setDocs] = useState([]);

  const [scanDone, setScanDone] = useState(false);

  /*
   * Custom date and time.
   */
  const [customDate, setCustomDate] = useState('');

  const [customTime, setCustomTime] = useState('');

  /*
   * Confirmation modal.
   */
  const [modalOpen, setModalOpen] = useState(false);

  /*
   * Live progress.
   */
  const [progress, setProgress] = useState({
    deleted: 0,
    total: 0,
    currentId: '',
  });

  /*
   * Deleted IDs.
   */
  const [deletedIds, setDeletedIds] = useState([]);


  /* -------------------------------------------------------
     CUSTOM TIMESTAMP
  ------------------------------------------------------- */

  const selectedDate = createCustomDate(
    customDate,
    customTime
  );


  /* -------------------------------------------------------
     VALID DOCUMENTS
  ------------------------------------------------------- */

  const validDocs = docs.filter(
    (item) => item.createTime
  );


  /*
   * Jinke paas createTime nahi hai.
   *
   * Ye automatically delete nahi honge.
   */
  const noDateCount =
    docs.filter(
      (item) => !item.createTime
    ).length;


  /* -------------------------------------------------------
     DOCUMENTS TO DELETE
  ------------------------------------------------------- */

  const documentsToDelete = selectedDate
    ? validDocs.filter(
        (item) =>
          item.createTime.getTime() <
          selectedDate.getTime()
      )
    : [];


  /* =========================================================
     SCAN
  ========================================================= */

  const scan = async () => {
    setScanning(true);

    setScanDone(false);

    setDocs([]);

    setDeletedIds([]);

    setProgress({
      deleted: 0,
      total: 0,
      currentId: '',
    });

    setCustomDate('');

    setCustomTime('');

    onMessage('');

    try {

      const result =
        await listAllViaRest(
          collectionName
        );


      /*
       * Oldest first.
       */
      result.sort((a, b) => {

        if (
          !a.createTime &&
          !b.createTime
        ) {
          return 0;
        }

        if (!a.createTime) {
          return 1;
        }

        if (!b.createTime) {
          return -1;
        }

        return (
          a.createTime.getTime() -
          b.createTime.getTime()
        );
      });


      setDocs(result);

      setScanDone(true);

      onMessage(
        `${title}: ${result.length} document(s) scanned successfully.`
      );

    } catch (error) {

      console.error(
        `Error scanning ${collectionName}:`,
        error
      );

      onMessage(
        `Failed to scan ${title}. Check Firebase configuration and permissions.`
      );

    } finally {

      setScanning(false);
    }
  };


  /* =========================================================
     OPEN CONFIRMATION MODAL
  ========================================================= */

  const openDeleteModal = () => {

    if (!scanDone) {
      onMessage(
        'Please scan the collection first.'
      );

      return;
    }


    if (!customDate || !customTime) {

      onMessage(
        'Please select both date and time.'
      );

      return;
    }


    if (!selectedDate) {

      onMessage(
        'Invalid date/time selected.'
      );

      return;
    }


    if (documentsToDelete.length === 0) {

      onMessage(
        `No document was created before ${formatExactTimestamp(
          selectedDate
        )}.`
      );

      return;
    }


    setModalOpen(true);
  };


  /* =========================================================
     DELETE
  ========================================================= */

  const handleDelete = async () => {

    if (
      !selectedDate ||
      documentsToDelete.length === 0
    ) {
      return;
    }


    setModalOpen(false);

    setDeleting(true);

    setDeletedIds([]);

    setProgress({
      deleted: 0,
      total: documentsToDelete.length,
      currentId: '',
    });

    onMessage('');


    try {

      const deleted =
        await deleteDocumentsWithProgress(
          documentsToDelete,
          collectionName,
          ({
            deleted: count,
            total,
            id,
          }) => {

            /*
             * Live progress.
             */
            setProgress({
              deleted: count,
              total,
              currentId: id,
            });


            /*
             * Latest deleted ID top par.
             */
            setDeletedIds((prev) => [
              id,
              ...prev,
            ]);
          }
        );


      /*
       * Local UI se deleted documents remove.
       */
      const deletedIdSet =
        new Set(
          documentsToDelete.map(
            (item) => item.id
          )
        );


      setDocs((prev) =>
        prev.filter(
          (item) =>
            !deletedIdSet.has(item.id)
        )
      );


      /*
       * Custom cutoff clear.
       */
      setCustomDate('');

      setCustomTime('');


      onMessage(
        `Successfully deleted ${deleted} document(s) from ${title}.`
      );

    } catch (error) {

      console.error(
        `Error deleting ${collectionName}:`,
        error
      );


      onMessage(
        `Delete process stopped because of an error. ${progress.deleted} document(s) were deleted before the error.`
      );

    } finally {

      setDeleting(false);
    }
  };


  /* =========================================================
     STYLES
  ========================================================= */

  const cardStyle = {
    border: '1px solid #E5E7EB',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    backgroundColor: '#FBFBFF',
  };


  const purpleButton = {
    backgroundColor: '#5813EA',
    color: 'white',
    borderRadius: 100,
    border: 'none',
    fontFamily: 'DMM',
    padding: '9px 20px',
    outline: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  };


  const redButton = {
    backgroundColor: '#DC2626',
    color: 'white',
    borderRadius: 100,
    border: 'none',
    fontFamily: 'DMM',
    padding: '9px 20px',
    outline: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  };


  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    borderRadius: 10,
    border: '1px solid #D8D1F5',
    backgroundColor: 'white',
    fontFamily: 'DMM',
    fontSize: 13,
    outline: 'none',
  };


  /* =========================================================
     UI
  ========================================================= */

  return (
    <>
      <div style={cardStyle}>

        {/* ---------------------------------------------------
            HEADER
        --------------------------------------------------- */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >

          <FontAwesomeIcon
            icon={icon}
            style={{
              color: '#5813EA',
              fontSize: 20,
            }}
          />

          <div style={{ flex: 1 }}>

            <div
              style={{
                fontFamily: 'DMM',
                fontSize: 17,
                fontWeight: 700,
                color: '#1E1E1E',
              }}
            >
              {title}
            </div>


            <div
              style={{
                fontFamily: 'DMM',
                fontSize: 12,
                color: '#7D716A',
                marginTop: 3,
                lineHeight: 1.5,
              }}
            >
              {description}
            </div>

          </div>

        </div>


        {/* ---------------------------------------------------
            SCAN BUTTON
        --------------------------------------------------- */}

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
          }}
        >

          <button
            onClick={scan}
            disabled={
              scanning ||
              deleting
            }
            style={{
              ...purpleButton,
              opacity:
                scanning ||
                deleting
                  ? 0.65
                  : 1,
            }}
          >

            {scanning ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinner}
                  spin
                  style={{
                    marginRight: 8,
                  }}
                />

                Scanning...
              </>
            ) : (
              <>
                <FontAwesomeIcon
                  icon={faSearch}
                  style={{
                    marginRight: 8,
                  }}
                />

                Scan {title}
              </>
            )}

          </button>


          {scanDone && (
            <span
              style={{
                backgroundColor: '#EAF7EA',
                color: '#218A25',
                borderRadius: 100,
                padding: '5px 12px',
                fontFamily: 'DMM',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {docs.length} docs found
            </span>
          )}

        </div>


        {/* ---------------------------------------------------
            CUSTOM DATE + TIME
        --------------------------------------------------- */}

        {scanDone && (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              backgroundColor: '#F7F5FF',
              borderRadius: 12,
              border: '1px solid #E7E0FF',
            }}
          >

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'DMM',
                fontSize: 14,
                fontWeight: 700,
                color: '#1E1E1E',
                marginBottom: 12,
              }}
            >

              <FontAwesomeIcon
                icon={faClock}
                style={{
                  color: '#5813EA',
                }}
              />

              Select Custom Delete Timestamp

            </div>


            {/* DATE + TIME */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  isMobileView
                    ? '1fr'
                    : '1fr 1fr',
                gap: 12,
              }}
            >

              {/* DATE */}
              <div>

                <label
                  style={{
                    display: 'block',
                    fontFamily: 'DMM',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#5F5660',
                    marginBottom: 6,
                  }}
                >
                  Date
                </label>


                <input
                  type="date"
                  value={customDate}
                  onChange={(e) =>
                    setCustomDate(
                      e.target.value
                    )
                  }
                  disabled={deleting}
                  style={inputStyle}
                />

              </div>


              {/* TIME */}
              <div>

                <label
                  style={{
                    display: 'block',
                    fontFamily: 'DMM',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#5F5660',
                    marginBottom: 6,
                  }}
                >
                  Time
                </label>


                <input
                  type="time"
                  step="1"
                  value={customTime}
                  onChange={(e) =>
                    setCustomTime(
                      e.target.value
                    )
                  }
                  disabled={deleting}
                  style={inputStyle}
                />

              </div>

            </div>


            {/* ------------------------------------------------
                SELECTED TIMESTAMP PREVIEW
            ------------------------------------------------ */}

            {selectedDate && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: 'white',
                  border:
                    '1px solid #E5E7EB',
                  fontFamily: 'DMM',
                  fontSize: 12,
                  color: '#5F5660',
                }}
              >

                <div>
                  <b>
                    Custom cutoff:
                  </b>
                </div>


                <div
                  style={{
                    marginTop: 5,
                    color: '#5813EA',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    wordBreak: 'break-word',
                  }}
                >
                  {formatExactTimestamp(
                    selectedDate
                  )}
                </div>


                <div
                  style={{
                    marginTop: 5,
                    color: '#7D716A',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    wordBreak: 'break-word',
                  }}
                >
                  {formatISO(
                    selectedDate
                  )}
                </div>


                <div
                  style={{
                    marginTop: 9,
                    lineHeight: 1.6,
                  }}
                >
                  <b>
                    {documentsToDelete.length}
                  </b>{' '}
                  document(s) will be deleted.
                </div>


                <div
                  style={{
                    marginTop: 4,
                    color: '#166534',
                  }}
                >
                  Documents created exactly at this
                  timestamp will remain.
                </div>


                {noDateCount > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      color: '#B45309',
                    }}
                  >

                    <FontAwesomeIcon
                      icon={
                        faExclamationTriangle
                      }
                      style={{
                        marginRight: 5,
                      }}
                    />

                    {noDateCount} document(s)
                    have no valid createTime.
                    They will NOT be deleted.

                  </div>
                )}

              </div>
            )}


            {/* ------------------------------------------------
                DELETE BUTTON
            ------------------------------------------------ */}

            <button
              onClick={
                openDeleteModal
              }
              disabled={
                !selectedDate ||
                deleting ||
                documentsToDelete.length === 0
              }
              style={{
                ...redButton,
                marginTop: 14,
                opacity:
                  !selectedDate ||
                  deleting ||
                  documentsToDelete.length === 0
                    ? 0.45
                    : 1,
                cursor:
                  !selectedDate ||
                  deleting ||
                  documentsToDelete.length === 0
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >

              <FontAwesomeIcon
                icon={faTrash}
                style={{
                  marginRight: 8,
                }}
              />

              Delete Before This Timestamp

            </button>

          </div>
        )}


        {/* ===================================================
            LIVE DELETE PROGRESS
        =================================================== */}

        {deleting && (
          <div
            style={{
              marginTop: 15,
              padding: 14,
              borderRadius: 12,
              backgroundColor: '#FFF7ED',
              border: '1px solid #FED7AA',
            }}
          >

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'DMM',
                fontSize: 14,
                fontWeight: 700,
                color: '#9A3412',
              }}
            >

              <FontAwesomeIcon
                icon={faSpinner}
                spin
              />

              Deleting...

              {' '}

              {progress.deleted}

              {' / '}

              {progress.total}

            </div>


            {/* PROGRESS BAR */}
            <div
              style={{
                marginTop: 10,
                height: 8,
                width: '100%',
                backgroundColor: '#FED7AA',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >

              <div
                style={{
                  height: '100%',
                  width:
                    progress.total > 0
                      ? `${(
                          progress.deleted /
                          progress.total
                        ) * 100}%`
                      : '0%',
                  backgroundColor: '#DC2626',
                  transition:
                    'width 0.2s ease',
                }}
              />

            </div>


            {progress.currentId && (
              <div
                style={{
                  marginTop: 8,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#7C2D12',
                  wordBreak: 'break-all',
                }}
              >
                Latest deleted:

                {' '}

                {progress.currentId}
              </div>
            )}

          </div>
        )}


        {/* ===================================================
            DELETED DOCUMENT IDS
        =================================================== */}

        {deletedIds.length > 0 && (
          <div
            style={{
              marginTop: 14,
              border:
                '1px solid #DCFCE7',
              borderRadius: 12,
              backgroundColor: '#F0FDF4',
              padding: 12,
              maxHeight: 180,
              overflowY: 'auto',
            }}
          >

            <div
              style={{
                fontFamily: 'DMM',
                fontSize: 13,
                fontWeight: 700,
                color: '#166534',
                marginBottom: 8,
              }}
            >

              <FontAwesomeIcon
                icon={faCheckCircle}
                style={{
                  marginRight: 6,
                }}
              />

              Deleted documents (
              {deletedIds.length}
              )

            </div>


            {deletedIds.map(
              (id, index) => (
                <div
                  key={`${id}-${index}`}
                  style={{
                    fontFamily:
                      'monospace',
                    fontSize: 11,
                    color: '#166534',
                    padding:
                      '3px 0',
                    borderBottom:
                      index !==
                      deletedIds.length - 1
                        ? '1px solid #DCFCE7'
                        : 'none',
                    wordBreak:
                      'break-all',
                  }}
                >
                  ✓ {id}
                </div>
              )
            )}

          </div>
        )}

      </div>


      {/* =====================================================
          CONFIRMATION MODAL
      ===================================================== */}

      <Modal
        isOpen={modalOpen}
        onRequestClose={() =>
          !deleting &&
          setModalOpen(false)
        }
        ariaHideApp={false}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform:
              'translate(-50%, -50%)',
            borderRadius: 16,
            border:
              '1px solid #E5E7EB',
            padding: 24,
            width: 440,
            maxWidth: '92vw',
            fontFamily: 'DMM',
          },

          overlay: {
            backgroundColor:
              'rgba(20, 10, 50, 0.45)',
            zIndex: 1000,
          },
        }}
      >

        {/* MODAL TITLE */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#1E1E1E',
          }}
        >

          <FontAwesomeIcon
            icon={
              faExclamationTriangle
            }
            style={{
              marginRight: 8,
              color: '#DC2626',
            }}
          />

          Confirm Permanent Deletion

        </div>


        {/* MODAL CONTENT */}
        <div
          style={{
            color: '#7D716A',
            fontSize: 14,
            marginTop: 14,
            lineHeight: 1.7,
          }}
        >

          You are about to permanently
          delete

          {' '}

          <b
            style={{
              color: '#DC2626',
            }}
          >
            {documentsToDelete.length}
          </b>

          {' '}

          document(s) from

          {' '}

          <b>
            {collectionName}
          </b>

          .


          <br />
          <br />


          <b>
            Delete everything created
            before:
          </b>


          <br />


          <span
            style={{
              color: '#5813EA',
              fontFamily:
                'monospace',
            }}
          >
            {selectedDate
              ? formatExactTimestamp(
                  selectedDate
                )
              : ''}
          </span>


          <br />


          <span
            style={{
              fontFamily:
                'monospace',
              fontSize: 11,
            }}
          >
            {selectedDate
              ? formatISO(
                  selectedDate
                )
              : ''}
          </span>


          <br />
          <br />


          The selected timestamp itself
          will <b>NOT</b> be deleted.


          <br />
          <br />


          <b
            style={{
              color: '#DC2626',
            }}
          >
            This action cannot be undone.
          </b>

        </div>


        {/* MODAL BUTTONS */}
        <div
          style={{
            display: 'flex',
            justifyContent:
              'flex-end',
            gap: 10,
            marginTop: 22,
          }}
        >

          <button
            onClick={() =>
              setModalOpen(false)
            }
            disabled={deleting}
            style={{
              backgroundColor:
                'white',
              color: '#7D716A',
              borderRadius: 100,
              border:
                '1px solid #7D716A',
              fontFamily: 'DMM',
              padding:
                '9px 20px',
              outline: 'none',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Cancel
          </button>


          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              ...redButton,
              padding:
                '9px 24px',
            }}
          >

            {deleting ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinner}
                  spin
                  style={{
                    marginRight: 8,
                  }}
                />

                Deleting...
              </>
            ) : (
              'Yes, Delete'
            )}

          </button>

        </div>

      </Modal>
    </>
  );
};


/* =========================================================
   MAIN DB ADMIN PAGE
========================================================= */

const DB = () => {

  const isMobileView =
    window.innerWidth <= 615;


  const [message, setMessage] =
    useState('');


  /* =======================================================
     PAGE STYLES
  ======================================================= */

  const homeStyle = {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: 20,

    background: `
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 50px,
        rgba(255, 133, 244, 0.8) 50px,
        rgba(66, 133, 244, 0.8) 51px
      ),

      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 50px,
        rgba(66, 133, 244, 0.8) 50px,
        rgba(66, 133, 244, 0.8) 51px
      ),

      #5813ea
    `,
  };


  const contentStyle = {
    width:
      isMobileView
        ? '100%'
        : '70%',

    minHeight: '85vh',

    border:
      '1px solid #ccc',

    borderRadius: 15,

    display: 'flex',

    flexDirection:
      'column',

    alignItems:
      'flex-start',

    overflow:
      'hidden',

    backgroundColor:
      '#F3F6FC',
  };


  const headingStyle = {
    width: '100%',

    backgroundColor:
      '#FFF4E8',

    fontSize:
      isMobileView
        ? 18
        : 25,

    fontFamily:
      'DMM',

    fontWeight:
      500,

    paddingTop: 5,

    paddingBottom: 5,

    display: 'flex',

    flexDirection:
      'row',

    justifyContent:
      'space-between',

    alignItems:
      'center',
  };


  const mainboxStyle = {
    width: '90%',

    backgroundColor:
      'white',

    borderRadius: 15,

    margin:
      '20px auto',

    border:
      '1px solid #E5E7EB',

    overflowY:
      'auto',

    scrollbarWidth:
      'none',

    msOverflowStyle:
      'none',

    padding: 20,

    boxSizing:
      'border-box',
  };


  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      <Navbar />


      <div
        style={homeStyle}
      >

        <div
          style={contentStyle}
        >

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div
            style={headingStyle}
          >

            <div
              style={{
                marginLeft: 30,
                margin: 3,
              }}
            >

              <FontAwesomeIcon
                icon={faTrash}
                style={{
                  marginRight: 10,
                  color: '#5813EA',
                }}
              />

              Firebase DB Cleanup

            </div>

          </div>


          {/* =================================================
              MAIN
          ================================================= */}

          <div
            style={mainboxStyle}
          >

            {/* =================================================
                REQUESTS
            ================================================= */}

            <CleanupCard
              title="Requests / Tutor Requests"
              collectionName="Requests"
              icon={
                faClipboardList
              }
              isMobileView={
                isMobileView
              }
              description="
                Select your own custom date and exact time.
                All Requests created before that timestamp will be deleted.
              "
              onMessage={
                setMessage
              }
            />


            {/* =================================================
                EXPERTS
            ================================================= */}

            <CleanupCard
              title="Skilled Users / Experts"
              collectionName="Skilled"
              icon={
                faUserTie
              }
              isMobileView={
                isMobileView
              }
              description="
                Select your own custom date and exact time.
                All Expert/Skilled users created before that timestamp will be deleted.
              "
              onMessage={
                setMessage
              }
            />


            {/* =================================================
                LEARNERS
            ================================================= */}

            <CleanupCard
              title="Leaner Users / Learners"
              collectionName="Learner"
              icon={
                faUsers
              }
              isMobileView={
                isMobileView
              }
              description="
                Select your own custom date and exact time.
                All Leaner/Learner users created before that timestamp will be deleted.
              "
              onMessage={
                setMessage
              }
            />


            {/* =================================================
                GLOBAL MESSAGE
            ================================================= */}

            {message && (
              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: 8,
                  color: '#38BE3C',
                  fontFamily:
                    'DMM',
                  fontSize: 14,
                  marginTop: 6,
                }}
              >

                <FontAwesomeIcon
                  icon={
                    faCheckCircle
                  }
                />

                {message}

              </div>
            )}

          </div>

        </div>

      </div>
    </>
  );
};


export default DB;