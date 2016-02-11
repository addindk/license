sudo iptables -P INPUT ACCEPT
sudo iptables -P OUTPUT ACCEPT
sudo iptables -P FORWARD ACCEPT
sudo iptables -F
sudo iptables -A INPUT -p tcp -s 188.178.222.138 --dport 22 -i eth0 -j ACCEPT
sudo iptables -A OUTPUT -p tcp -d 188.178.222.138 --sport 22 -o eth0 -m state --state ESTABLISHED -j ACCEPT
sudo iptables -A INPUT -p tcp -s 188.178.222.138 --dport 5432 -i eth0 -j ACCEPT
sudo iptables -A OUTPUT -p tcp -d 188.178.222.138 --sport 5432 -o eth0 -m state --state ESTABLISHED -j ACCEPT
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A OUTPUT -o lo -j ACCEPT
sudo iptables -I OUTPUT -o eth0 -d 0.0.0.0/0 -j ACCEPT
sudo iptables -I INPUT -i eth0 -m state --state ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -i eth1 -j ACCEPT
sudo iptables -A OUTPUT -o eth1 -j ACCEPT
sudo iptables -P INPUT DROP
sudo iptables -P OUTPUT DROP
sudo iptables -P FORWARD DROP