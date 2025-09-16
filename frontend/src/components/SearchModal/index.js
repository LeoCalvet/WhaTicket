import React, { useState, useEffect, useRef, useContext } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import { format, parseISO } from "date-fns";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import { SearchMessageContext } from "../../context/SearchMessage/SearchMessageContext";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    height: "100%",
    width: 320,
    position: "absolute",
    top: 0,
    right: 0,
    margin: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderLeft: "1px solid rgba(0, 0, 0, 0.12)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 24px",
    borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
  },
  content: {
    padding: 0,
    height: "100%",
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  listItem: {
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#eee",
    },
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  noResults: {
    padding: theme.spacing(2),
    textAlign: "center",
  },
}));

const SearchModal = ({ open, onClose, ticketId }) => {
  const classes = useStyles();
  const [searchParam, setSearchParam] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const searchInputRef = useRef();
  const { setMessageId } = useContext(SearchMessageContext);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if(searchInputRef.current) {
            searchInputRef.current.focus();
        }
      }, 50);
    } else {
        setSearchParam("");
        setMessages([]);
        setPageNumber(1);
        setHasMore(true);
    }
  }, [open]);

  useEffect(() => {
    if (searchParam.length < 2) {
      setMessages([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      setPageNumber(1);
      const fetchMessages = async () => {
        try {
          const { data } = await api.get(`/messages/${ticketId}/search`, {
            params: { searchParam, pageNumber: 1 },
          });
          setMessages(data.messages);
          setHasMore(data.hasMore);
        } catch (err) {
          toastError(err);
        }
        setLoading(false);
      };
      fetchMessages();
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, ticketId]);

  const handleScroll = async (e) => {
    if (!hasMore || loading) return;

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    if (scrollHeight - scrollTop < clientHeight + 100) {
      setLoading(true);
      const nextPage = pageNumber + 1;
      try {
        const { data } = await api.get(`/messages/${ticketId}/search`, {
          params: { searchParam, pageNumber: nextPage },
        });
        setMessages((prev) => [...prev, ...data.messages]);
        setHasMore(data.hasMore);
        setPageNumber(nextPage);
      } catch (err) {
        toastError(err);
      }
      setLoading(false);
    }
  };

  const handleMessageClick = (messageId) => {
    setMessageId(messageId);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      hideBackdrop
      classes={{ paper: classes.dialogPaper }}
      disableEnforceFocus
    >
      <div className={classes.header}>
        <Typography variant="subtitle1">Buscar Mensagens</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </div>
      <DialogContent dividers className={classes.content} onScroll={handleScroll}>
        <TextField
          inputRef={searchInputRef}
          value={searchParam}
          onChange={(e) => setSearchParam(e.target.value)}
          fullWidth
          variant="outlined"
          placeholder="Pesquisar..."
          margin="dense"
        />
        <List>
          {messages.map((message) => (
            <ListItem
              key={message.id}
              dense
              className={classes.listItem}
              onClick={() => handleMessageClick(message.id)}
            >
              <ListItemText
                primary={message.body}
                secondary={format(parseISO(message.createdAt), "dd/MM/yyyy HH:mm")}
              />
            </ListItem>
          ))}
        </List>
        {loading && (
          <div className={classes.loading}>
            <CircularProgress size={24} />
          </div>
        )}
        {!loading && messages.length === 0 && searchParam.length > 1 && (
            <Typography className={classes.noResults}>Nenhum resultado encontrado.</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SearchModal;
